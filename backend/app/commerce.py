"""Plans, coupons and orders. Prices are computed here from the stored price list, never taken from the client.

Payment is simulated for now (no payment gateway is connected): an order is created as "pending" and a
demo confirmation marks it paid and upgrades the account.
"""
import json
import re
from datetime import date, datetime, timezone

from .database import db

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


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---- plans --------------------------------------------------------------------------------------

def _plan(row):
    d = dict(row)
    d["active"] = bool(d["active"])
    d["perks"] = json.loads(d.pop("perks_json") or "[]")
    return d


def list_plans(active_only=True):
    sql = "SELECT * FROM plans" + (" WHERE active = 1" if active_only else "") + " ORDER BY sort_order"
    with db() as conn:
        return [_plan(r) for r in conn.execute(sql)]


def get_plan(plan_id):
    with db() as conn:
        row = conn.execute("SELECT * FROM plans WHERE id = ?", (plan_id,)).fetchone()
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
    with db() as conn:
        conn.execute("UPDATE plans SET monthly = ?, yearly = ?, active = ? WHERE id = ?", (monthly, yearly, 1 if active else 0, plan_id))
    return get_plan(plan_id)


# ---- coupons ------------------------------------------------------------------------------------

def _coupon(row):
    return dict(row)


def list_coupons():
    with db() as conn:
        return [_coupon(r) for r in conn.execute("SELECT * FROM coupons ORDER BY rowid DESC")]


def get_coupon(code):
    with db() as conn:
        row = conn.execute("SELECT * FROM coupons WHERE id = ?", (str(code or "").strip().upper(),)).fetchone()
    return _coupon(row) if row else None


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
    with db() as conn:
        if existing:
            conn.execute(
                "UPDATE coupons SET campaign = ?, type = ?, value = ?, scope = ?, expires = ?, status = ? WHERE id = ?",
                (campaign, kind, value, scope, expires, status, code),
            )
        else:
            conn.execute(
                "INSERT INTO coupons (id, campaign, type, value, scope, expires, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (code, campaign, kind, value, scope, expires, status),
            )
    return get_coupon(code)


def delete_coupon(code):
    with db() as conn:
        conn.execute("DELETE FROM coupons WHERE id = ?", (str(code).upper(),))


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

def _next_order_id(conn):
    nums = [int(m.group(1)) for (oid,) in conn.execute("SELECT id FROM orders") if (m := re.match(r"VP-(\d+)$", oid))]
    return f"VP-{max(nums + [9081]) + 1}"


def list_orders(account_id=None):
    sql, params = "SELECT * FROM orders", ()
    if account_id:
        sql, params = sql + " WHERE account_id = ?", (account_id,)
    with db() as conn:
        return [dict(r) for r in conn.execute(sql + " ORDER BY created_at DESC, rowid DESC", params)]


def get_order(order_id):
    with db() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    return dict(row) if row else None


PAYMENT_METHODS = ("QR ngân hàng", "MoMo", "VNPay")


def create_order(account, plan_id, period, coupon_code=None, method="QR ngân hàng"):
    plan, _, final, coupon = price_for(plan_id, period, coupon_code)
    if method not in PAYMENT_METHODS:
        raise CommerceError("Phương thức thanh toán không hợp lệ.")
    with db() as conn:
        order_id = _next_order_id(conn)
        conn.execute(
            """INSERT INTO orders (id, account_id, customer, email, phone, plan, amount, method, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (order_id, account["id"], account["name"], account["email"], account["phone"],
             f"Gói {plan['name']} {PERIOD_LABEL[period]}" + (f" (mã {coupon['id']})" if coupon else ""),
             final, f"{method} (mô phỏng)", _now()),
        )
    return get_order(order_id)


def confirm_demo_payment(order_id, account):
    """Simulated payment confirmation: marks the caller's own pending order paid and upgrades the plan."""
    order = get_order(order_id)
    if not order or order["account_id"] != account["id"]:
        raise CommerceError("Không tìm thấy đơn hàng.", 404)
    if order["status"] != "pending":
        raise CommerceError("Đơn hàng này không còn ở trạng thái chờ thanh toán.", 409)
    plan_name = re.match(r"Gói (\w+)", order["plan"]).group(1).lower()
    with db() as conn:
        conn.execute("UPDATE orders SET status = 'paid' WHERE id = ?", (order_id,))
        conn.execute("UPDATE accounts SET plan = ? WHERE id = ?", (plan_name, account["id"]))
    return get_order(order_id)


def set_order_status(order_id, status):
    if status not in ORDER_STATUSES:
        raise CommerceError("Trạng thái đơn hàng không hợp lệ.")
    if not get_order(order_id):
        raise CommerceError("Không tìm thấy đơn hàng.", 404)
    with db() as conn:
        conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    return get_order(order_id)
