"""Reference data (lessons, rewards, plans, coupons, settings) and, outside production, demo accounts.

Everything is inserted only when missing, so running it on every start never overwrites what the admin
edited. Demo accounts and their practice history are flagged `is_demo` and are never created when
VIETPHONICS_ENV=production; the admin account there comes from VIETPHONICS_ADMIN_EMAIL/PASSWORD
(or a random password printed once).
"""
import json
import logging
import secrets
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .accounts import create_account, find_by_email, temporary_password
from .alignment import _phone_category
from .catalog import UPLOAD_DIR
from .config import ADMIN_EMAIL, ADMIN_PASSWORD, PRODUCTION
from .database import db
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


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def seed_reference():
    with db() as conn:
        if conn.execute("SELECT COUNT(*) FROM lessons").fetchone()[0] == 0:
            for order, lesson in enumerate(LESSONS, start=1):
                data = {k: v for k, v in lesson.items() if k != "id"}
                conn.execute(
                    "INSERT INTO lessons (id, status, sort_order, data, updated_at) VALUES (?, 'published', ?, ?, ?)",
                    (lesson["id"], order, json.dumps(data, ensure_ascii=False), _now()),
                )
        if conn.execute("SELECT COUNT(*) FROM plans").fetchone()[0] == 0:
            for order, (pid, name, monthly, yearly, perks) in enumerate(PLANS, start=1):
                conn.execute(
                    "INSERT INTO plans (id, name, monthly, yearly, active, perks_json, sort_order) VALUES (?, ?, ?, ?, 1, ?, ?)",
                    (pid, name, monthly, yearly, json.dumps(perks, ensure_ascii=False), order),
                )
        if conn.execute("SELECT COUNT(*) FROM coupons").fetchone()[0] == 0:
            conn.executemany("INSERT INTO coupons (id, campaign, type, value, scope, expires, status) VALUES (?, ?, ?, ?, ?, ?, ?)", COUPONS)
        if conn.execute("SELECT COUNT(*) FROM rewards").fetchone()[0] == 0:
            folder = UPLOAD_DIR / "rewards"
            folder.mkdir(parents=True, exist_ok=True)
            for order, (rid, title, kind, cost, icon, image, active) in enumerate(REWARDS, start=1):
                stored = None
                if (SEED_ASSETS / image).exists():
                    shutil.copy(SEED_ASSETS / image, folder / image)
                    stored = f"rewards/{image}"
                conn.execute(
                    "INSERT INTO rewards (id, title, kind, cost, icon, image, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (rid, title, kind, cost, icon, stored, active, order, _now()),
                )
        for key, value in SETTINGS.items():
            conn.execute("INSERT OR IGNORE INTO settings (key, value_json) VALUES (?, ?)", (key, json.dumps(value, ensure_ascii=False)))


# ---- admin ---------------------------------------------------------------------------------------------

def seed_admin():
    with db() as conn:
        if conn.execute("SELECT COUNT(*) FROM accounts WHERE role = 'admin'").fetchone()[0]:
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
    now = datetime.now(timezone.utc)
    rows = []
    for lesson in lessons[:completed]:
        rows += [(lesson["id"], w) for w in lesson["words"]]
    if completed < len(lessons) and completed > 0:
        rows += [(lessons[completed]["id"], w) for w in lessons[completed]["words"][:2]]
    with db() as conn:
        for i, (lesson_id, word) in enumerate(rows):
            back = len(rows) - 1 - i  # 0 = most recent attempt
            offset = back if back < streak_days else streak_days + 2 + ((back - streak_days) // 2) * 3
            score = max(PASS, min(99, base_score + (i * 7) % 11 - 3))
            day = now - timedelta(days=offset, hours=i % 5)
            conn.execute(
                """INSERT INTO practice_history (child_id, word, canonical, score, is_correct, errors_json, lesson_id, phones_json, created_at)
                   VALUES (?, ?, ?, ?, 1, '[]', ?, ?, ?)""",
                (child_id, word["word"], word["canonical"], score, lesson_id,
                 json.dumps(_phones(word["canonical"], weak, wrong=i % 2 == 0)), day.strftime("%Y-%m-%d %H:%M:%S")),
            )


PASS = 70


def seed_demo():
    if PRODUCTION or find_by_email(DEMO_PARENT["email"]):
        return
    lessons = [json.loads(r["data"]) | {"id": r["id"]} for r in _published_rows()]
    parent = create_account(**DEMO_PARENT, is_demo=True)

    with db() as conn:
        # Adopt the two demo children older databases already contain (their points are kept).
        for child_id, name, age, avatar, stars in (("child-minh", "Bé Minh", 7, "mascot:khung-long", 240), ("child-an", "Bé An", 6, "mascot:tho", 95)):
            exists = conn.execute("SELECT 1 FROM children WHERE id = ?", (child_id,)).fetchone()
            if exists:
                conn.execute("UPDATE children SET parent_id = ?, name = ?, age = ?, avatar = ?, stars = ? WHERE id = ?",
                             (parent["id"], name, age, avatar, stars, child_id))
            else:
                conn.execute("INSERT INTO children (id, name, age, avatar, stars, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
                             (child_id, name, age, avatar, stars, parent["id"]))
            # Their history is rebuilt below so that it matches the lesson list.
            conn.execute("DELETE FROM practice_history WHERE child_id = ?", (child_id,))
    _practice_lessons("child-minh", lessons, 8, 84, 5, weak=("S", "s", "N", "ts_", "tS"))
    _practice_lessons("child-an", lessons, 3, 74, 2, weak=("_3", "_4", "l", "n"))

    for name, email, phone, plan, locked, kids in DEMO_FAMILIES:
        account = create_account(name=name, email=email, phone=phone, password="123456", plan=plan, is_demo=True)
        if locked:
            with db() as conn:
                conn.execute("UPDATE accounts SET status = 'locked' WHERE id = ?", (account["id"],))
        for kid_name, age, avatar, stars, completed, score in kids:
            child_id = f"child-demo-{secrets.token_hex(4)}"
            with db() as conn:
                conn.execute("INSERT INTO children (id, name, age, avatar, stars, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
                             (child_id, kid_name, age, avatar, stars, account["id"]))
            _practice_lessons(child_id, lessons, completed, score, 1, weak=("S", "s") if score < 80 else ())
    seed_demo_orders(parent)


def seed_demo_orders(parent):
    orders = [
        ("VP-9082", None, "Lê Hoàng Nam", "hoangnam.parent@gmail.com", "0988123456", "Gói Premium 1 Năm", 699000, "Cổng VNPay", "paid", "2026-09-29 09:12"),
        ("VP-9083", None, "Nguyễn Minh Triết", "triet.nguyen@gmail.com", "0912345679", "Gói Family 1 Năm", 1083000, "Cổng MoMo", "paid", "2026-09-28 14:32"),
        ("VP-9084", None, "Phạm Minh Thư", "minhthu@gmail.com", "0977111222", "Gói Basic 1 Tháng", 49000, "QR ngân hàng", "pending", "2026-09-28 10:05"),
        ("VP-9085", None, "Đặng Anh Tuấn", "tuan.dang@gmail.com", "0966555444", "Gói Premium 1 Năm", 699000, "Cổng VNPay", "failed", "2026-09-27 21:40"),
        ("VP-9086", None, "Trần Thị Lan", "lan.tran@gmail.com", "0955333222", "Gói Premium 1 Tháng", 79000, "Cổng MoMo", "expired", "2026-09-26 08:30"),
        ("VP-9087", None, "Vũ Hoàng Yến", "yen.vu@gmail.com", "0933444555", "Gói Family 1 Năm", 1083000, "QR ngân hàng", "refunded", "2026-09-25 16:18"),
        ("VP-9081", parent["id"], parent["name"], parent["email"], parent["phone"], "Gói Premium 1 Năm", 699000, "MoMo", "paid", "2026-01-12 10:00"),
    ]
    with db() as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO orders (id, account_id, customer, email, phone, plan, amount, method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            orders,
        )


def _published_rows():
    with db() as conn:
        return conn.execute("SELECT * FROM lessons WHERE status = 'published' ORDER BY sort_order").fetchall()


def seed_all():
    seed_reference()
    seed_admin()
    seed_demo()
