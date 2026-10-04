"""Admin console API. Every route requires a signed-in account with role "admin"."""
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from .. import accounts, catalog, commerce, kids
from ..database import db
from ..security import admin_account
from ..validation import ValidationError

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(admin_account)])

MAX_RETENTION_DAYS = 365


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def audit(actor, action):
    with db() as conn:
        conn.execute("INSERT INTO audit_logs (actor, action, created_at) VALUES (?, ?, ?)", (actor["name"], action, _now()))


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
    with db() as conn:
        return {r["key"]: json.loads(r["value_json"]) for r in conn.execute("SELECT key, value_json FROM settings")}


def _audit_rows(limit=30):
    with db() as conn:
        return [dict(r) for r in conn.execute("SELECT id, actor, action, created_at FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))]


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


def _metrics():
    now = datetime.now(timezone.utc)
    with db() as conn:
        one = lambda sql, *a: conn.execute(sql, a).fetchone()[0]  # noqa: E731
        paid = one("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status = 'paid'")
        by_plan = [dict(r) for r in conn.execute(
            "SELECT plan, COUNT(*) AS orders, SUM(amount) AS amount FROM orders WHERE status = 'paid' GROUP BY plan ORDER BY amount DESC")]
        recent = [dict(r) for r in conn.execute(
            """SELECT h.score, h.word, h.created_at, c.name AS child FROM practice_history h
               JOIN children c ON c.id = h.child_id ORDER BY h.created_at DESC, h.id DESC LIMIT 6""")]
        daily = []
        for back in range(6, -1, -1):
            day = (now - timedelta(days=back)).strftime("%Y-%m-%d")
            amount = one("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status = 'paid' AND substr(created_at, 1, 10) = ?", day)
            daily.append({"day": day, "amount": amount})
        attempts_daily = []
        for back in range(6, -1, -1):
            day = (now - timedelta(days=back)).strftime("%Y-%m-%d")
            attempts_daily.append({"day": day, "count": one("SELECT COUNT(*) FROM practice_history WHERE substr(created_at, 1, 10) = ?", day)})
        sounds = {"initial": [0, 0], "final": [0, 0], "tone": [0, 0]}
        for (phones_json,) in conn.execute("SELECT phones_json FROM practice_history"):
            for _token, category, ok in json.loads(phones_json or "[]"):
                if category in sounds:
                    sounds[category][1] += 1
                    sounds[category][0] += 1 if ok else 0
        return {
            "attemptsDaily": attempts_daily,
            "soundAccuracy": {k: (round(100 * c / t) if t else None) for k, (c, t) in sounds.items()},
            "parents": one("SELECT COUNT(*) FROM accounts WHERE role = 'parent'"),
            "children": one("SELECT COUNT(*) FROM children WHERE parent_id IS NOT NULL"),
            "attempts": one("SELECT COUNT(*) FROM practice_history"),
            "paidOrders": one("SELECT COUNT(*) FROM orders WHERE status = 'paid'"),
            "pendingOrders": one("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
            "revenue": paid,
            "paidParents": one("SELECT COUNT(*) FROM accounts WHERE role = 'parent' AND plan != 'free'"),
            "revenueByPlan": by_plan,
            "revenueDaily": daily,
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
    with db() as conn:
        row = conn.execute("SELECT name FROM children WHERE id = ?", (child_id,)).fetchone()
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
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO settings (key, value_json) VALUES ('audioRetentionDays', ?)", (json.dumps(days),))
    audit(admin, f"Đổi thời hạn lưu âm thanh thành {days} ngày")
    return _settings()


@router.get("/audit")
def audit_log():
    return _audit_rows()
