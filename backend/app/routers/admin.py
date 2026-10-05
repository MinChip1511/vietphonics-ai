"""Admin console API. Every route requires a signed-in account with role "admin"."""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from .. import accounts, catalog, commerce, kids
from ..database import col, now_iso, utc_now
from ..security import admin_account
from ..validation import ValidationError

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(admin_account)])

MAX_RETENTION_DAYS = 365


def audit(actor, action):
    col("audit_logs").insert_one({"actor": actor["name"], "action": action, "created_at": now_iso()})


def _parent(account_id):
    row = accounts.get_account(account_id)
    if not row or row["role"] != "parent":
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản phụ huynh")
    return row


class NewParentBody(BaseModel):
    name: str
    email: str
    phone: str
    plan: str = "free"


class AccountPatch(BaseModel):
    status: Optional[str] = None
    plan: Optional[str] = None


class StatusBody(BaseModel):
    status: str


# ---- overview ---------------------------------------------------------------------------------------

def _settings():
    return {d["_id"]: d["value"] for d in col("settings").find()}


def _audit_rows(limit=30):
    return [{"id": str(d["_id"]), "actor": d["actor"], "action": d["action"], "created_at": d["created_at"]}
            for d in col("audit_logs").find().sort("_id", -1).limit(limit)]


def _accounts_with_children():
    children = kids.all_children()
    by_parent = {}
    for child in children:
        by_parent.setdefault(child["parent_id"], []).append({
            "id": child["id"], "name": child["name"], "age": child["age"], "score": child["overall_accuracy"],
            "completed_lessons": child["completed_lessons"], "stars": child["stars"],
        })
    result = []
    for acc in accounts.list_accounts():
        result.append({**acc, "kids": by_parent.get(acc["id"], [])})
    return result, [c for c in children if not c["parent_id"]]


def _per_day(collection, match, value):
    """{"2026-10-03": total} for the documents matching `match`, in ONE aggregation (not one query per day)."""
    rows = col(collection).aggregate([
        {"$match": match},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "total": {"$sum": value}}},
    ])
    return {r["_id"]: r["total"] for r in rows}


SOUND_SAMPLE = 5000  # the sound statistics use the latest attempts, so the cost does not grow with history


def _metrics():
    now = utc_now()
    first_day = (now - timedelta(days=6)).strftime("%Y-%m-%d")
    paid = list(col("orders").aggregate([{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]))
    by_plan = [
        {"plan": d["_id"], "orders": d["orders"], "amount": d["amount"]}
        for d in col("orders").aggregate([
            {"$match": {"status": "paid"}},
            {"$group": {"_id": "$plan", "orders": {"$sum": 1}, "amount": {"$sum": "$amount"}}},
            {"$sort": {"amount": -1}},
        ])
    ]
    latest = list(col("practice_history").find().sort([("created_at", -1), ("_id", -1)]).limit(30))
    names = {c["_id"]: c["name"] for c in col("children").find({"_id": {"$in": list({h["child_id"] for h in latest})}}, {"name": 1})}
    recent = [
        {"score": h["score"], "word": h["word"], "created_at": h["created_at"], "child": names[h["child_id"]]}
        for h in latest if h["child_id"] in names
    ][:6]
    revenue_by_day = _per_day("orders", {"status": "paid", "created_at": {"$gte": first_day}}, "$amount")
    attempts_by_day = _per_day("practice_history", {"created_at": {"$gte": first_day}}, 1)
    days = [(now - timedelta(days=back)).strftime("%Y-%m-%d") for back in range(6, -1, -1)]
    sounds = {"initial": [0, 0], "final": [0, 0], "tone": [0, 0]}
    for h in col("practice_history").find({}, {"phones": 1}).sort("_id", -1).limit(SOUND_SAMPLE):
        for _token, category, ok in h.get("phones", []):
            if category in sounds:
                sounds[category][1] += 1
                sounds[category][0] += 1 if ok else 0
    return {
        "attemptsDaily": [{"day": d, "count": attempts_by_day.get(d, 0)} for d in days],
        "soundAccuracy": {k: (round(100 * c / t) if t else None) for k, (c, t) in sounds.items()},
        "parents": col("accounts").count_documents({"role": "parent"}),
        "children": col("children").count_documents({"parent_id": {"$ne": None}}),
        "attempts": col("practice_history").count_documents({}),
        "paidOrders": col("orders").count_documents({"status": "paid"}),
        "pendingOrders": col("orders").count_documents({"status": "pending"}),
        "revenue": paid[0]["total"] if paid else 0,
        "paidParents": col("accounts").count_documents({"role": "parent", "plan": {"$ne": "free"}}),
        "revenueByPlan": by_plan,
        "revenueDaily": [{"day": d, "amount": revenue_by_day.get(d, 0)} for d in days],
        "recentSubmissions": recent,
    }


@router.get("/bootstrap")
def bootstrap():
    accts, orphans = _accounts_with_children()
    return {
        "accounts": accts,
        "unownedChildren": [{"id": c["id"], "name": c["name"], "age": c["age"]} for c in orphans],
        "orders": commerce.list_orders(),
        "plans": commerce.list_plans(active_only=False),
        "coupons": commerce.list_coupons(),
        "lessons": catalog.list_lessons(published_only=False),
        "rewards": catalog.list_rewards(active_only=False),
        "audit": _audit_rows(),
        "settings": _settings(),
        "metrics": _metrics(),
        "phones": sorted(catalog.valid_phones()),
    }


# ---- accounts ---------------------------------------------------------------------------------------------

@router.post("/accounts", status_code=201)
def create_parent(body: NewParentBody, admin: dict = Depends(admin_account)):
    if body.plan not in {p["id"] for p in commerce.list_plans(active_only=False)}:
        raise ValidationError("Gói không hợp lệ.")
    row, temp = accounts.admin_create_parent(name=body.name, email=body.email, phone=body.phone, plan=body.plan)
    audit(admin, f"Tạo tài khoản phụ huynh {row['email']}")
    return {"account": {**accounts.public_account(row), "kids": []}, "temporaryPassword": temp}


@router.patch("/accounts/{account_id}")
def patch_account(account_id: str, body: AccountPatch, admin: dict = Depends(admin_account)):
    row = _parent(account_id)
    if body.status:
        accounts.set_status(account_id, body.status)
        audit(admin, f"{'Khóa' if body.status == 'locked' else 'Mở khóa'} tài khoản {row['email']}")
    if body.plan:
        if body.plan not in {p["id"] for p in commerce.list_plans(active_only=False)}:
            raise ValidationError("Gói không hợp lệ.")
        accounts.set_plan(account_id, body.plan)
        audit(admin, f"Đổi gói tài khoản {row['email']} sang {body.plan}")
    return accounts.public_account(accounts.get_account(account_id))


@router.post("/accounts/{account_id}/reset-password")
def reset_parent_password(account_id: str, admin: dict = Depends(admin_account)):
    row = _parent(account_id)
    temp = accounts.admin_reset_password(account_id)
    audit(admin, f"Cấp lại mật khẩu tạm cho {row['email']}")
    return {"temporaryPassword": temp}


@router.delete("/accounts/{account_id}")
def delete_parent(account_id: str, admin: dict = Depends(admin_account)):
    row = _parent(account_id)
    accounts.delete_account(account_id)
    audit(admin, f"Xóa tài khoản {row['email']} và dữ liệu của bé")
    return {"status": "deleted"}


@router.delete("/children/{child_id}")
def delete_child(child_id: str, admin: dict = Depends(admin_account)):
    row = col("children").find_one({"_id": child_id}, {"name": 1})
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ bé")
    kids.delete_child(child_id)
    audit(admin, f"Xóa hồ sơ bé '{row['name']}'")
    return {"status": "deleted"}


# ---- lessons ----------------------------------------------------------------------------------------------

@router.post("/lessons", status_code=201)
def create_lesson(body: dict, admin: dict = Depends(admin_account)):
    lesson = catalog.save_lesson(body, known_phones=catalog.valid_phones())
    audit(admin, f"Tạo bài học '{lesson['title']}'")
    return lesson


@router.put("/lessons/{lesson_id}")
def update_lesson(lesson_id: str, body: dict, admin: dict = Depends(admin_account)):
    lesson = catalog.save_lesson(body, lesson_id, known_phones=catalog.valid_phones())
    audit(admin, f"Cập nhật bài học '{lesson['title']}' ({lesson['status']})")
    return lesson


@router.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: str, admin: dict = Depends(admin_account)):
    lesson = catalog.get_lesson(lesson_id, published_only=False)
    if not lesson:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học")
    catalog.delete_lesson(lesson_id)
    audit(admin, f"Xóa bài học '{lesson['title']}'")
    return {"status": "deleted"}


# ---- rewards ----------------------------------------------------------------------------------------------

@router.post("/rewards", status_code=201)
def create_reward(body: dict, admin: dict = Depends(admin_account)):
    reward = catalog.save_reward(body)
    audit(admin, f"Tạo phần thưởng '{reward['title']}'")
    return reward


@router.put("/rewards/{reward_id}")
def update_reward(reward_id: str, body: dict, admin: dict = Depends(admin_account)):
    before = catalog.get_reward(reward_id)
    reward = catalog.save_reward(body, reward_id)
    if before and before["cost"] != reward["cost"]:
        audit(admin, f"Sửa giá '{reward['title']}' thành {reward['cost']} điểm")
    elif before and before["active"] != reward["active"]:
        audit(admin, f"{'Kích hoạt' if reward['active'] else 'Tạm ngưng'} phần thưởng '{reward['title']}'")
    else:
        audit(admin, f"Cập nhật phần thưởng '{reward['title']}'")
    return reward


@router.post("/rewards/{reward_id}/image")
async def upload_reward_image(reward_id: str, image: UploadFile = File(...), admin: dict = Depends(admin_account)):
    data = await image.read(catalog.MAX_IMAGE_BYTES + 1)
    reward = catalog.save_reward_image(reward_id, image.content_type, data)
    audit(admin, f"Đổi ảnh phần thưởng '{reward['title']}'")
    return reward


@router.delete("/rewards/{reward_id}")
def delete_reward(reward_id: str, admin: dict = Depends(admin_account)):
    reward = catalog.get_reward(reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Không tìm thấy phần thưởng")
    outcome = catalog.delete_reward(reward_id)
    audit(admin, f"{'Xóa' if outcome == 'deleted' else 'Lưu trữ'} phần thưởng '{reward['title']}'")
    return {"status": outcome}


# ---- plans, coupons, orders, settings -----------------------------------------------------------------

@router.put("/plans/{plan_id}")
def update_plan(plan_id: str, body: dict, admin: dict = Depends(admin_account)):
    plan = commerce.update_plan(plan_id, body)
    audit(admin, f"Cập nhật gói {plan['name']}")
    return plan


@router.post("/coupons", status_code=201)
def create_coupon(body: dict, admin: dict = Depends(admin_account)):
    if commerce.get_coupon(body.get("id")):
        raise commerce.CommerceError("Mã này đã tồn tại.", 409)
    coupon = commerce.save_coupon(body)
    audit(admin, f"Tạo mã giảm giá {coupon['id']}")
    return coupon


@router.put("/coupons/{code}")
def update_coupon(code: str, body: dict, admin: dict = Depends(admin_account)):
    if not commerce.get_coupon(code):
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")
    coupon = commerce.save_coupon(body, code)
    audit(admin, f"Cập nhật mã giảm giá {coupon['id']}")
    return coupon


@router.delete("/coupons/{code}")
def delete_coupon(code: str, admin: dict = Depends(admin_account)):
    commerce.delete_coupon(code)
    audit(admin, f"Xóa mã giảm giá {code.upper()}")
    return {"status": "deleted"}


@router.patch("/orders/{order_id}")
def patch_order(order_id: str, body: StatusBody, admin: dict = Depends(admin_account)):
    order = commerce.set_order_status(order_id, body.status)
    audit(admin, f"Đổi trạng thái đơn {order_id} thành {body.status}")
    return order


@router.put("/settings")
def update_settings(body: dict, admin: dict = Depends(admin_account)):
    days = body.get("audioRetentionDays")
    if not isinstance(days, int) or isinstance(days, bool) or not 1 <= days <= MAX_RETENTION_DAYS:
        raise ValidationError(f"Thời gian lưu cần từ 1 đến {MAX_RETENTION_DAYS} ngày.")
    col("settings").update_one({"_id": "audioRetentionDays"}, {"$set": {"value": days}}, upsert=True)
    audit(admin, f"Đổi thời hạn lưu âm thanh thành {days} ngày")
    return _settings()


@router.get("/audit")
def audit_log():
    return _audit_rows()
