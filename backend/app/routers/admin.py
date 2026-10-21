"""Admin console API. Every route requires a signed-in account with role "admin"."""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from .. import accounts, catalog, commerce, config, email_service, kids
from ..database import col, now_iso, utc_now
from ..ratelimit import limit_by_account
from ..security import admin_account
from ..validation import ValidationError, clean_email

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


class EmailTestBody(BaseModel):
    to: str


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
    commerce.expire_subscriptions()
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


# ---- analytics dashboard ----------------------------------------------------------------------------

RANGES = {"today", "7d", "30d", "quarter"}
RECENT_BUYERS = 8
TOP_FAMILIES = 5


def _day(moment):
    return moment.strftime("%Y-%m-%d")


def _window(range_name, now):
    """(first_day, last_day) of the range and of the equally long period right before it (UTC days)."""
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_name == "today":
        length = 1
    elif range_name == "30d":
        length = 30
    elif range_name == "quarter":
        quarter_start = today.replace(month=3 * ((today.month - 1) // 3) + 1, day=1)
        length = (today - quarter_start).days + 1
    else:
        length = 7
    first = today - timedelta(days=length - 1)
    return first, today, length


def _bounds(first, last):
    """Half-open string bounds for ISO timestamps: [first 00:00, day after last)."""
    return _day(first), _day(last + timedelta(days=1))


def _delta(current, previous):
    """Percent change, or None when there is nothing to compare with (never a division by zero)."""
    if not previous:
        return None
    return round(100 * (current - previous) / previous, 1)


def _paid_orders_stage(lo, hi):
    """Paid orders dated by paid_at (created_at for older orders) inside [lo, hi)."""
    return [
        {"$match": {"status": "paid"}},
        {"$addFields": {"paid_time": {"$ifNull": ["$paid_at", "$created_at"]}}},
        {"$match": {"paid_time": {"$gte": lo, "$lt": hi}}},
    ]


def _revenue(lo, hi):
    rows = list(col("orders").aggregate(_paid_orders_stage(lo, hi) + [
        {"$group": {"_id": None, "amount": {"$sum": "$amount"}, "orders": {"$sum": 1}}},
    ]))
    return (rows[0]["amount"], rows[0]["orders"]) if rows else (0, 0)


def _attempts_per_parent(lo, hi, tail=()):
    """Attempts in [lo, hi) summed per parent: group by child first, then join the child's parent."""
    return col("practice_history").aggregate([
        {"$match": {"created_at": {"$gte": lo, "$lt": hi}}},
        {"$group": {"_id": "$child_id", "attempts": {"$sum": 1}}},
        {"$lookup": {"from": "children", "localField": "_id", "foreignField": "_id", "as": "child"}},
        {"$unwind": "$child"},
        {"$match": {"child.parent_id": {"$ne": None}}},
        {"$group": {"_id": "$child.parent_id", "attempts": {"$sum": "$attempts"}, "children": {"$sum": 1}}},
        *tail,
    ])


def _count(rows):
    return len(list(rows))


def _mask_email(email):
    name, _, domain = str(email or "").partition("@")
    return f"{name[:1]}***@{domain}" if domain else "***"


def _buyers_by_plan(lo, hi):
    """Per plan id: distinct paying accounts and paid orders, overall and inside the range."""
    result = []
    for plan in commerce.list_plans(active_only=False):
        if not plan["monthly"]:
            continue
        rows = list(col("orders").aggregate([
            {"$match": {"status": "paid", "plan": {"$regex": f"^Gói {plan['name']} "}}},
            {"$addFields": {"in_range": {"$cond": [{"$and": [
                {"$gte": [{"$ifNull": ["$paid_at", "$created_at"]}, lo]},
                {"$lt": [{"$ifNull": ["$paid_at", "$created_at"]}, hi]}]}, 1, 0]}}},
            {"$group": {"_id": "$account_id", "orders": {"$sum": 1}, "range_orders": {"$sum": "$in_range"}}},
            {"$group": {"_id": None, "buyers": {"$sum": 1}, "orders": {"$sum": "$orders"}, "range_orders": {"$sum": "$range_orders"},
                        "range_buyers": {"$sum": {"$cond": [{"$gt": ["$range_orders", 0]}, 1, 0]}}}},
        ]))
        r = rows[0] if rows else {}
        result.append({
            "id": plan["id"], "name": plan["name"], "monthly": plan["monthly"],
            "buyers": r.get("buyers", 0), "orders": r.get("orders", 0),
            "rangeBuyers": r.get("range_buyers", 0), "rangeOrders": r.get("range_orders", 0),
        })
    return result


def _funnel(lo, hi):
    """Parents registered in the range -> with a child profile -> a child that practised -> on a paid plan."""
    cohort = col("accounts").distinct("_id", {"role": "parent", "created_at": {"$gte": lo, "$lt": hi}})
    with_child = col("children").distinct("parent_id", {"parent_id": {"$in": cohort}}) if cohort else []
    child_ids = col("children").distinct("_id", {"parent_id": {"$in": with_child}}) if with_child else []
    practised = col("practice_history").distinct("child_id", {"child_id": {"$in": child_ids}}) if child_ids else []
    with_attempt = col("children").distinct("parent_id", {"_id": {"$in": practised}}) if practised else []
    paid = col("accounts").count_documents({"_id": {"$in": cohort}, "plan": {"$ne": "free"}}) if cohort else 0
    counts = [("Phụ huynh đăng ký", len(cohort)), ("Đã tạo hồ sơ bé", len(with_child)),
              ("Bé đã luyện phát âm", len(with_attempt)), ("Dùng gói trả phí", paid)]
    steps = []
    for i, (label, count) in enumerate(counts):
        before = counts[i - 1][1] if i else count
        steps.append({"label": label, "count": count, "ofPrevious": round(100 * count / before, 1) if before else None})
    return steps


@router.get("/dashboard")
def dashboard(range_name: str = Query("7d", alias="range")):
    """Analytics for the overview screen; every number is aggregated from the database for the chosen range."""
    if range_name not in RANGES:
        raise ValidationError("Khoảng thời gian không hợp lệ.")
    commerce.expire_subscriptions()
    now = utc_now()
    first, last, length = _window(range_name, now)
    lo, hi = _bounds(first, last)
    prev_first, prev_last = first - timedelta(days=length), first - timedelta(days=1)
    plo, phi = _bounds(prev_first, prev_last)

    active = _count(_attempts_per_parent(lo, hi))
    active_prev = _count(_attempts_per_parent(plo, phi))
    attempts = col("practice_history").count_documents({"created_at": {"$gte": lo, "$lt": hi}})
    attempts_prev = col("practice_history").count_documents({"created_at": {"$gte": plo, "$lt": phi}})
    new_parents = col("accounts").count_documents({"role": "parent", "created_at": {"$gte": lo, "$lt": hi}})
    new_parents_prev = col("accounts").count_documents({"role": "parent", "created_at": {"$gte": plo, "$lt": phi}})
    revenue, paid_orders = _revenue(lo, hi)
    revenue_prev, _ = _revenue(plo, phi)
    parents = col("accounts").count_documents({"role": "parent"})
    paid_parents = col("accounts").count_documents({"role": "parent", "plan": {"$ne": "free"}})

    # The chart covers the range; "today" shows the 6 days before it as context (one day alone is no chart).
    chart_first = first - timedelta(days=6) if range_name == "today" else first
    clo, _ = _bounds(chart_first, last)
    new_by_day = _per_day("accounts", {"role": "parent", "created_at": {"$gte": clo, "$lt": hi}}, 1)
    attempts_by_day = _per_day("practice_history", {"created_at": {"$gte": clo, "$lt": hi}}, 1)
    revenue_by_day = {r["_id"]: r["amount"] for r in col("orders").aggregate(_paid_orders_stage(clo, hi) + [
        {"$group": {"_id": {"$substr": ["$paid_time", 0, 10]}, "amount": {"$sum": "$amount"}}}])}
    days = [_day(chart_first + timedelta(days=i)) for i in range((last - chart_first).days + 1)]

    by_plan = [
        {"plan": r["_id"], "orders": r["orders"], "buyers": len(r["buyers"]), "amount": r["amount"]}
        for r in col("orders").aggregate(_paid_orders_stage(lo, hi) + [
            {"$group": {"_id": "$plan", "orders": {"$sum": 1}, "amount": {"$sum": "$amount"}, "buyers": {"$addToSet": "$account_id"}}},
            {"$sort": {"amount": -1}},
        ])
    ]
    recent = [
        {"customer": r["customer"], "email": _mask_email(r.get("email")), "plan": r["plan"], "amount": r["amount"], "paid_at": r["paid_time"]}
        for r in col("orders").aggregate([
            {"$match": {"status": "paid"}},
            {"$addFields": {"paid_time": {"$ifNull": ["$paid_at", "$created_at"]}}},
            {"$sort": {"paid_time": -1}}, {"$limit": RECENT_BUYERS},
        ])
    ]
    top_rows = list(_attempts_per_parent(lo, hi, tail=[{"$sort": {"attempts": -1, "_id": 1}}, {"$limit": TOP_FAMILIES}]))
    owners = {a["_id"]: a for a in col("accounts").find({"_id": {"$in": [r["_id"] for r in top_rows]}}, {"name": 1, "plan": 1})}
    all_children = {r["_id"]: r["n"] for r in col("children").aggregate([
        {"$match": {"parent_id": {"$in": list(owners)}}}, {"$group": {"_id": "$parent_id", "n": {"$sum": 1}}}])}
    plan_names = {p["id"]: p["name"] for p in commerce.list_plans(active_only=False)}
    top = [
        {"name": owners[r["_id"]]["name"], "children": all_children.get(r["_id"], 0), "attempts": r["attempts"],
         "plan": plan_names.get(owners[r["_id"]].get("plan"), owners[r["_id"]].get("plan", ""))}
        for r in top_rows if r["_id"] in owners
    ]
    return {
        "range": range_name, "generatedAt": now_iso(), "from": _day(first), "to": _day(last),
        "kpis": {
            "activeFamilies": {"value": active, "previous": active_prev, "delta": _delta(active, active_prev)},
            "newParents": {"value": new_parents, "previous": new_parents_prev, "delta": _delta(new_parents, new_parents_prev)},
            "totalParents": parents,
            "attempts": {"value": attempts, "previous": attempts_prev, "delta": _delta(attempts, attempts_prev)},
            "revenue": {"value": revenue, "previous": revenue_prev, "delta": _delta(revenue, revenue_prev),
                        "paidOrders": paid_orders, "average": round(revenue / paid_orders) if paid_orders else 0},
            "conversion": {"paidParents": paid_parents, "parents": parents, "percent": round(100 * paid_parents / parents, 1) if parents else 0},
        },
        "daily": [{"day": d, "newParents": new_by_day.get(d, 0), "attempts": attempts_by_day.get(d, 0), "revenue": revenue_by_day.get(d, 0)} for d in days],
        "revenueByPlan": by_plan,
        "buyersByPlan": _buyers_by_plan(lo, hi),
        "recentBuyers": recent,
        "funnel": _funnel(lo, hi),
        "topFamilies": top,
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


@router.post("/email/test")
def email_test(body: EmailTestBody, admin: dict = limit_by_account("email_test", 5, 60)):
    """Sends a test mail and returns the provider's real error. Emailed sign-in codes hide failures on
    purpose (so they never reveal which accounts exist); this admin-only check shows them."""
    to = clean_email(body.to)
    if not email_service.configured():
        raise HTTPException(status_code=503, detail=f"Chưa cấu hình gửi email (EMAIL_PROVIDER={config.EMAIL_PROVIDER}). Kiểm tra các biến EMAIL_PROVIDER, SMTP_USER, SMTP_PASSWORD trên Render.")
    try:
        email_service.send_email(to, "Thư thử VietPhonics AI", "Nếu bạn đọc được thư này, việc gửi email của VietPhonics AI đã hoạt động.")
    except email_service.EmailUnavailable as exc:
        raise HTTPException(status_code=502, detail=f"Gửi thất bại: {exc}")
    audit(admin, f"Gửi email thử tới {to}")
    return {"status": "sent", "provider": config.EMAIL_PROVIDER}
