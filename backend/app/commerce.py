"""Plans, coupons and orders. Prices are computed here from the stored price list, never taken from the client.

Payment is simulated for now (no payment gateway is connected): an order is created as "pending" and a
demo confirmation marks it paid and upgrades the account.
"""
import re
from datetime import date

from pymongo import ReturnDocument

from .database import clean, clean_all, col, now_iso

ORDER_STATUSES = ("paid", "pending", "failed", "expired", "refunded")
PERIODS = ("monthly", "yearly")
PERIOD_LABEL = {"monthly": "1 Tháng", "yearly": "1 Năm"}
COUPON_TYPES = ("percent", "amount")
_CODE = re.compile(r"^[A-Z0-9_-]{3,30}$")


class CommerceError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


# ---- plans --------------------------------------------------------------------------------------

def _plan(row):
    d = clean(row)
    d["active"] = bool(d["active"])
    d["perks"] = d.pop("perks", [])
    return d


def list_plans(active_only=True):
    query = {"active": True} if active_only else {}
    return [_plan(r) for r in col("plans").find(query).sort("sort_order", 1)]


def get_plan(plan_id):
    row = col("plans").find_one({"_id": plan_id})
    return _plan(row) if row else None


def update_plan(plan_id, payload):
    plan = get_plan(plan_id)
    if not plan:
        raise CommerceError("Không tìm thấy gói.", 404)
    try:
        monthly = int(payload.get("monthly", plan["monthly"]))
        yearly = payload.get("yearly", plan["yearly"])
        yearly = None if yearly in (None, "") else int(yearly)
    except (TypeError, ValueError):
        raise CommerceError("Giá phải là một số.")
    if monthly < 0 or (yearly is not None and yearly < 0):
        raise CommerceError("Giá không được âm.")
    if plan["id"] == "free" and (monthly or yearly):
        raise CommerceError("Gói Free luôn miễn phí.")
    active = bool(payload.get("active", plan["active"]))
    col("plans").update_one({"_id": plan_id}, {"$set": {"monthly": monthly, "yearly": yearly, "active": active}})
    return get_plan(plan_id)


# ---- coupons ------------------------------------------------------------------------------------

def list_coupons():
    return clean_all(col("coupons").find().sort("_id", 1))


def get_coupon(code):
    return clean(col("coupons").find_one({"_id": str(code or "").strip().upper()}))


def save_coupon(payload, code=None):
    code = (code or str(payload.get("id") or "")).strip().upper()
    if not _CODE.match(code):
        raise CommerceError("Mã gồm 3–30 ký tự chữ in hoa, số, gạch ngang hoặc gạch dưới.")
    existing = get_coupon(code)
    kind = payload.get("type", (existing or {}).get("type"))
    if kind not in COUPON_TYPES:
        raise CommerceError("Loại giảm giá không hợp lệ.")
    try:
        value = int(payload.get("value", (existing or {}).get("value", 0)))
    except (TypeError, ValueError):
        raise CommerceError("Giá trị giảm phải là một số.")
    if value <= 0 or (kind == "percent" and value > 100):
        raise CommerceError("Giá trị giảm không hợp lệ.")
    expires = str(payload.get("expires", (existing or {}).get("expires") or ""))
    try:
        date.fromisoformat(expires)
    except ValueError:
        raise CommerceError("Ngày hết hạn không đúng định dạng.")
    status = payload.get("status", (existing or {}).get("status", "active"))
    if status not in ("active", "stopped"):
        raise CommerceError("Trạng thái không hợp lệ.")
    campaign = str(payload.get("campaign", (existing or {}).get("campaign", ""))).strip()
    if not campaign:
        raise CommerceError("Vui lòng nhập tên chiến dịch.")
    scope = str(payload.get("scope", (existing or {}).get("scope", ""))).strip()
    col("coupons").replace_one(
        {"_id": code},
        {"_id": code, "campaign": campaign, "type": kind, "value": value, "scope": scope, "expires": expires, "status": status},
        upsert=True,
    )
    return get_coupon(code)


def delete_coupon(code):
    col("coupons").delete_one({"_id": str(code).upper()})


def _scope_allows(scope, plan_id, period):
    scope = (scope or "").lower()
    if not scope:
        return True
    if "năm" in scope and period != "yearly":
        return False
    if "gia đình" in scope and plan_id != "family":
        return False
    return True


def price_for(plan_id, period, coupon_code=None):
    """(plan, base price, final price, coupon) for a purchase. Raises CommerceError for invalid input."""
    plan = get_plan(plan_id)
    if not plan or not plan["active"] or plan_id == "free":
        raise CommerceError("Gói này hiện không thể mua.")
    if period not in PERIODS:
        raise CommerceError("Chu kỳ thanh toán không hợp lệ.")
    base = plan["monthly"] if period == "monthly" else plan["yearly"]
    if not base:
        raise CommerceError(f"Gói {plan['name']} không bán theo {'năm' if period == 'yearly' else 'tháng'}.")
    coupon = None
    final = base
    if coupon_code and str(coupon_code).strip():
        coupon = get_coupon(coupon_code)
        if not coupon:
            raise CommerceError("Mã giảm giá không tồn tại.")
        if coupon["status"] != "active" or date.fromisoformat(coupon["expires"]) < date.today():
            raise CommerceError("Mã giảm giá đã hết hạn hoặc bị dừng.")
        if not _scope_allows(coupon["scope"], plan_id, period):
            raise CommerceError(f"Mã này chỉ áp dụng cho {coupon['scope']}.")
        discount = round(base * coupon["value"] / 100) if coupon["type"] == "percent" else coupon["value"]
        final = max(0, base - discount)
    return plan, base, final, coupon


# ---- orders -------------------------------------------------------------------------------------

def _next_order_id():
    """VP-9082, VP-9083...: an atomic counter, so two simultaneous checkouts never share a number."""
    if not col("counters").find_one({"_id": "order"}):
        existing = [int(m.group(1)) for o in col("orders").find({}, {"_id": 1}) if (m := re.match(r"VP-(\d+)$", o["_id"]))]
        col("counters").update_one({"_id": "order"}, {"$setOnInsert": {"seq": max(existing + [9081])}}, upsert=True)
    seq = col("counters").find_one_and_update({"_id": "order"}, {"$inc": {"seq": 1}}, return_document=ReturnDocument.AFTER)["seq"]
    return f"VP-{seq}"


def list_orders(account_id=None):
    query = {"account_id": account_id} if account_id else {}
    return clean_all(col("orders").find(query).sort([("created_at", -1), ("_id", -1)]))


def get_order(order_id):
    return clean(col("orders").find_one({"_id": order_id}))


PAYMENT_METHODS = ("QR ngân hàng", "MoMo", "VNPay")


def create_order(account, plan_id, period, coupon_code=None, method="QR ngân hàng"):
    plan, _, final, coupon = price_for(plan_id, period, coupon_code)
    if method not in PAYMENT_METHODS:
        raise CommerceError("Phương thức thanh toán không hợp lệ.")
    order_id = _next_order_id()
    col("orders").insert_one({
        "_id": order_id, "account_id": account["id"], "customer": account["name"], "email": account["email"],
        "phone": account["phone"],
        "plan": f"Gói {plan['name']} {PERIOD_LABEL[period]}" + (f" (mã {coupon['id']})" if coupon else ""),
        "amount": final, "method": f"{method} (mô phỏng)", "status": "pending", "created_at": now_iso(),
    })
    return get_order(order_id)


def confirm_demo_payment(order_id, account):
    """Simulated payment confirmation: marks the caller's own pending order paid and upgrades the plan."""
    order = get_order(order_id)
    if not order or order["account_id"] != account["id"]:
        raise CommerceError("Không tìm thấy đơn hàng.", 404)
    paid = col("orders").find_one_and_update({"_id": order_id, "status": "pending"}, {"$set": {"status": "paid"}})
    if not paid:
        raise CommerceError("Đơn hàng này không còn ở trạng thái chờ thanh toán.", 409)
    plan_name = re.match(r"Gói (\w+)", order["plan"]).group(1).lower()
    col("accounts").update_one({"_id": account["id"]}, {"$set": {"plan": plan_name}})
    return get_order(order_id)


def set_order_status(order_id, status):
    if status not in ORDER_STATUSES:
        raise CommerceError("Trạng thái đơn hàng không hợp lệ.")
    if not get_order(order_id):
        raise CommerceError("Không tìm thấy đơn hàng.", 404)
    col("orders").update_one({"_id": order_id}, {"$set": {"status": status}})
    return get_order(order_id)
