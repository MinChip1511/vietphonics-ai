"""Reference data (lessons, rewards, plans, coupons, settings) and, outside production, demo accounts.

Everything is inserted only when missing, so running it on every start never overwrites what the admin
edited. Demo accounts and their practice history are flagged `is_demo` and are never created when
VIETPHONICS_ENV=production; the admin account there comes from VIETPHONICS_ADMIN_EMAIL/PASSWORD
(or a random password printed once).
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson import Binary

from .accounts import create_account, find_by_email, temporary_password
from .alignment import _phone_category
from .config import ADMIN_EMAIL, ADMIN_PASSWORD, PRODUCTION
from .database import col, iso, now_iso
from .lessons_data import LESSONS
from .phone_hints import is_nucleus, is_tone

SEED_ASSETS = Path(__file__).resolve().parent.parent / "seed_assets" / "rewards"

PLANS = [
    ("free", "Free", 0, None, ["29 chữ cái cơ bản", "Bài học thử", "Giới hạn 30 phút/ngày"]),
    ("basic", "Basic", 49000, None, ["Toàn bộ 29 chữ cái + thanh điệu", "Theo dõi tiến độ học tập", "Dùng thử 3 ngày miễn phí"]),
    ("premium", "Premium", 79000, 699000, ["Toàn bộ tính năng học tập", "Báo cáo tiến bộ chi tiết", "Không giới hạn thời gian", "Thêm game mới và nhân vật tùy chỉnh"]),
    ("family", "Family", 129000, 1083000, ["Dùng cho 2–3 trẻ em", "Toàn bộ tính năng Premium", "Theo dõi riêng tiến độ từng bé", "Báo cáo dành cho phụ huynh"]),
]
COUPONS = [
    ("PHUTRAI20", "Ưu đãi tựu trường - Khách hàng mới", "percent", 20, "gói năm", "2026-12-31", "active"),
    ("VIETPHONICS50K", "Tặng voucher trực tiếp từ App đối tác", "amount", 50000, "", "2026-11-15", "active"),
    ("KIDGIANGSINH", "Đợt lễ Giáng Sinh năm ngoái", "percent", 30, "gói gia đình", "2025-12-31", "stopped"),
]
REWARDS = [
    ("rw-rong", "Mũ Rồng Con Đỏ", "Mascot Outfit", 500, "🐲", "rong-do.jpg", 1),
    ("rw-sao", "Nhãn dán Bé Chăm Ngoan", "Visual Sticker", 150, "⭐", "sticker-sao.jpg", 1),
    ("rw-kiem", "Kiếm Ánh Sáng Phonics", "Mascot Outfit", 800, "⚔️", "kiem-anh-sang.jpg", 0),
    ("rw-huy-hieu", "Huy hiệu Trạng Nguyên AI", "Visual Sticker", 300, "🏅", "huy-hieu-trang-nguyen.jpg", 1),
]
SETTINGS = {
    "audioRetentionDays": 90,
    "paymentEnv": "SANDBOX (mô phỏng, chưa kết nối cổng thanh toán)",
    "roles": [
        {"id": "super", "name": "Super Admin (Quản trị tối cao)", "desc": "Mọi quyền truy cập hệ thống dữ liệu, cài đặt hệ thống.", "count": 1},
    ],
}

log = logging.getLogger("vietphonics.seed")


def seed_reference():
    if col("lessons").count_documents({}) == 0:
        col("lessons").insert_many([
            {"_id": lesson["id"], "status": "published", "sort_order": order,
             "data": {k: v for k, v in lesson.items() if k != "id"}, "updated_at": now_iso()}
            for order, lesson in enumerate(LESSONS, start=1)
        ])
    if col("plans").count_documents({}) == 0:
        col("plans").insert_many([
            {"_id": pid, "name": name, "monthly": monthly, "yearly": yearly, "active": True, "perks": perks, "sort_order": order}
            for order, (pid, name, monthly, yearly, perks) in enumerate(PLANS, start=1)
        ])
    if col("coupons").count_documents({}) == 0:
        col("coupons").insert_many([
            {"_id": cid, "campaign": campaign, "type": kind, "value": value, "scope": scope, "expires": expires, "status": status}
            for cid, campaign, kind, value, scope, expires, status in COUPONS
        ])
    if col("rewards").count_documents({}) == 0:
        for order, (rid, title, kind, cost, icon, image, active) in enumerate(REWARDS, start=1):
            file_id = None
            if (SEED_ASSETS / image).exists():  # the picture is stored in the database, next to the reward
                file_id = f"rewards/{image}"
                col("files").replace_one(
                    {"_id": file_id},
                    {"_id": file_id, "content_type": "image/jpeg", "data": Binary((SEED_ASSETS / image).read_bytes()), "created_at": now_iso()},
                    upsert=True,
                )
            col("rewards").insert_one({
                "_id": rid, "title": title, "kind": kind, "cost": cost, "icon": icon, "image": file_id,
                "active": bool(active), "sort_order": order, "created_at": now_iso(),
            })
    for key, value in SETTINGS.items():
        col("settings").update_one({"_id": key}, {"$setOnInsert": {"value": value}}, upsert=True)


# ---- admin ---------------------------------------------------------------------------------------------

def seed_admin():
    if col("accounts").count_documents({"role": "admin"}):
        return
    if PRODUCTION:
        email = ADMIN_EMAIL
        password = ADMIN_PASSWORD or temporary_password() + secrets.token_hex(2)
        create_account(name="Quản trị viên", email=email, phone="0900000001", password=password, role="admin", plan="family")
        if not ADMIN_PASSWORD:
            log.warning("Admin account created: %s / %s (shown once: change it after the first sign-in)", email, password)
    else:
        create_account(name="Quản trị viên Huy", email="admin@vietphonics.vn", phone="0900000001", password="admin123",
                       role="admin", plan="family", is_demo=True)


# ---- demo families ---------------------------------------------------------------------------------------

DEMO_PARENT = dict(name="Nguyễn Hoàng Nam", email="phuhuynh@vietphonics.vn", phone="0912345678", password="123456", plan="premium")
# (name, email, phone, plan, locked, [(child id or None, name, age, avatar, stars, completed lessons, base score)])
DEMO_FAMILIES = [
    ("Phạm Minh Toàn", "minhtoan@gmail.com", "0908123456", "family", False, [("Bé An", 5, "mascot:cun", 60, 1, 82), ("Bé Vy", 7, "mascot:ga", 140, 2, 94)]),
    ("Trương Thị Hồng", "hongtruong@yahoo.com", "0982789111", "basic", False, [("Bé Khải", 6, "mascot:gau-truc", 90, 3, 76)]),
    ("Lê Hoàng Quân", "hoangquan@outlook.com", "0911222333", "free", True, [("Bé Chi", 4, "mascot:tho", 0, 0, 58)]),
    ("Nguyễn Minh Triết", "triet.nguyen@gmail.com", "0912345679", "premium", False, [("Bé Bin", 6, "mascot:khung-long", 210, 4, 88)]),
    ("Vũ Hoàng Yến", "yen.vu@gmail.com", "0933444555", "basic", False, [("Bé Sóc", 5, "mascot:ca-voi", 75, 2, 69)]),
]


def _phones(canonical, weak=(), wrong=False):
    """[token, category, ok] per phone; tokens in `weak` are marked wrong when `wrong` (demo weaknesses)."""
    rows, seen_nucleus = [], False
    for token in canonical.split():
        category = _phone_category(token, seen_nucleus)
        if is_tone(token):
            seen_nucleus = False
        elif is_nucleus(token):
            seen_nucleus = True
        rows.append([token, category, not (wrong and token in weak)])
    return rows


def _practice_lessons(child_id, lessons, completed, base_score, streak_days, weak=()):
    """History that really completes the first `completed` lessons (and part of the next one).

    The latest `streak_days` days all have practice (a streak); older practice is spread over earlier
    weeks with gaps. Phones in `weak` are marked wrong on every other word (a demo weakness)."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rows = []
    for lesson in lessons[:completed]:
        rows += [(lesson["id"], w) for w in lesson["words"]]
    if completed < len(lessons) and completed > 0:
        rows += [(lessons[completed]["id"], w) for w in lessons[completed]["words"][:2]]
    docs = []
    for i, (lesson_id, word) in enumerate(rows):
        back = len(rows) - 1 - i  # 0 = most recent attempt
        offset = back if back < streak_days else streak_days + 2 + ((back - streak_days) // 2) * 3
        docs.append({
            "child_id": child_id, "word": word["word"], "canonical": word["canonical"],
            "score": max(PASS, min(99, base_score + (i * 7) % 11 - 3)), "is_correct": True, "errors": [],
            "lesson_id": lesson_id, "phones": _phones(word["canonical"], weak, wrong=i % 2 == 0),
            "created_at": iso(now - timedelta(days=offset, hours=i % 5, seconds=i)),
        })
    if docs:
        col("practice_history").insert_many(docs)


PASS = 70


def _demo_child(parent, child_id, name, age, avatar, stars):
    col("children").replace_one(
        {"_id": child_id},
        {"_id": child_id, "name": name, "age": age, "avatar": avatar, "stars": stars, "parent_id": parent["id"],
         "initial_needs": [], "settings": {}, "created_at": now_iso()},
        upsert=True,
    )
    col("practice_history").delete_many({"child_id": child_id})


def seed_demo():
    if PRODUCTION or find_by_email(DEMO_PARENT["email"]):
        return
    lessons = [{**d["data"], "id": d["_id"]} for d in col("lessons").find({"status": "published"}).sort("sort_order", 1)]
    parent = create_account(**DEMO_PARENT, is_demo=True)

    _demo_child(parent, "child-minh", "Bé Minh", 7, "mascot:khung-long", 240)
    _demo_child(parent, "child-an", "Bé An", 6, "mascot:tho", 95)
    _practice_lessons("child-minh", lessons, 8, 84, 5, weak=("S", "s", "N", "ts_", "tS"))
    _practice_lessons("child-an", lessons, 3, 74, 2, weak=("_3", "_4", "l", "n"))

    for name, email, phone, plan, locked, kids in DEMO_FAMILIES:
        account = create_account(name=name, email=email, phone=phone, password="123456", plan=plan, is_demo=True)
        if locked:
            col("accounts").update_one({"_id": account["id"]}, {"$set": {"status": "locked"}})
        for kid_name, age, avatar, stars, completed, score in kids:
            child_id = f"child-demo-{secrets.token_hex(4)}"
            _demo_child(account, child_id, kid_name, age, avatar, stars)
            _practice_lessons(child_id, lessons, completed, score, 1, weak=("S", "s") if score < 80 else ())
    seed_demo_orders(parent)


def seed_demo_orders(parent):
    orders = [
        ("VP-9082", None, "Lê Hoàng Nam", "hoangnam.parent@gmail.com", "0988123456", "Gói Premium 1 Năm", 699000, "Cổng VNPay", "paid", "2026-09-29T09:12:00.000Z"),
        ("VP-9083", None, "Nguyễn Minh Triết", "triet.nguyen@gmail.com", "0912345679", "Gói Family 1 Năm", 1083000, "Cổng MoMo", "paid", "2026-09-28T14:32:00.000Z"),
        ("VP-9084", None, "Phạm Minh Thư", "minhthu@gmail.com", "0977111222", "Gói Basic 1 Tháng", 49000, "QR ngân hàng", "pending", "2026-09-28T10:05:00.000Z"),
        ("VP-9085", None, "Đặng Anh Tuấn", "tuan.dang@gmail.com", "0966555444", "Gói Premium 1 Năm", 699000, "Cổng VNPay", "failed", "2026-09-27T21:40:00.000Z"),
        ("VP-9086", None, "Trần Thị Lan", "lan.tran@gmail.com", "0955333222", "Gói Premium 1 Tháng", 79000, "Cổng MoMo", "expired", "2026-09-26T08:30:00.000Z"),
        ("VP-9087", None, "Vũ Hoàng Yến", "yen.vu@gmail.com", "0933444555", "Gói Family 1 Năm", 1083000, "QR ngân hàng", "refunded", "2026-09-25T16:18:00.000Z"),
        ("VP-9081", parent["id"], parent["name"], parent["email"], parent["phone"], "Gói Premium 1 Năm", 699000, "MoMo", "paid", "2026-01-12T10:00:00.000Z"),
    ]
    for oid, account_id, customer, email, phone, plan, amount, method, status, created in orders:
        col("orders").update_one(
            {"_id": oid},
            {"$setOnInsert": {"account_id": account_id, "customer": customer, "email": email, "phone": phone, "plan": plan,
                              "amount": amount, "method": method, "status": status, "created_at": created}},
            upsert=True,
        )


def seed_all():
    seed_reference()
    seed_admin()
    seed_demo()
