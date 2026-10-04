"""Accounts, sign-in, one-time codes and password changes."""
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone

from .config import DEMO_OTP
from .database import db
from .security import (
    create_session, hash_code, hash_password, revoke_account_sessions, verify_password,
)
from .validation import (
    ValidationError, check_password, clean_email, clean_name, clean_phone, normalize_phone,
)

MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15
OTP_MINUTES = 5
OTP_MAX_ATTEMPTS = 5


class AuthError(Exception):
    def __init__(self, message, status=401):
        super().__init__(message)
        self.message = message
        self.status = status


def _now():
    return datetime.now(timezone.utc)


def _iso(moment):
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def public_account(row) -> dict:
    """The account as the client may see it (never the hash)."""
    with db() as conn:
        kids = [r["id"] for r in conn.execute("SELECT id FROM children WHERE parent_id = ? ORDER BY created_at", (row["id"],))]
    return {
        "id": row["id"],
        "role": row["role"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "plan": row["plan"],
        "status": row["status"],
        "mustChangePassword": bool(row["must_change_password"]),
        "isDemo": bool(row["is_demo"]),
        "createdAt": row["created_at"][:10],
        "childIds": kids,
    }


def get_account(account_id):
    with db() as conn:
        return conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()


def find_by_email(email):
    with db() as conn:
        return conn.execute("SELECT * FROM accounts WHERE email = ? COLLATE NOCASE", (str(email).strip(),)).fetchone()


def find_by_phone(phone):
    with db() as conn:
        return conn.execute("SELECT * FROM accounts WHERE phone = ?", (normalize_phone(phone),)).fetchone()


def create_account(*, name, email, phone, password, role="parent", plan="free", must_change_password=False, is_demo=False):
    """Validates and stores a new account. Raises ValidationError (bad input) or AuthError(409) (duplicate)."""
    name = clean_name(name, "họ tên")
    email = clean_email(email)
    phone = clean_phone(phone)
    if not is_demo:
        check_password(password)
    if find_by_email(email):
        raise AuthError("Email này đã được đăng ký.", 409)
    if find_by_phone(phone):
        raise AuthError("Số điện thoại này đã được đăng ký.", 409)
    account_id = f"acc-{uuid.uuid4().hex[:12]}"
    with db() as conn:
        conn.execute(
            """INSERT INTO accounts (id, role, name, email, phone, password_hash, plan, status,
                                     must_change_password, is_demo, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
            (account_id, role, name, email, phone, hash_password(password), plan,
             1 if must_change_password else 0, 1 if is_demo else 0, _iso(_now())),
        )
    return get_account(account_id)


def temporary_password() -> str:
    """A random password that satisfies the password rule; it is shown once to the admin."""
    pools = [string.ascii_lowercase, string.ascii_uppercase, string.digits]
    chars = [secrets.choice(p) for p in pools] + [secrets.choice(string.ascii_letters + string.digits) for _ in range(7)]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def login_with_password(email, password, remember=True):
    row = find_by_email(email or "")
    generic = AuthError("Email hoặc mật khẩu chưa đúng.")
    if not row:
        raise generic
    if row["locked_until"] and row["locked_until"] > _iso(_now()):
        raise AuthError("Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.", 429)
    if not verify_password(password or "", row["password_hash"]):
        failures = row["failed_logins"] + 1
        locked_until = _iso(_now() + timedelta(minutes=LOCKOUT_MINUTES)) if failures >= MAX_FAILED_LOGINS else None
        with db() as conn:
            conn.execute(
                "UPDATE accounts SET failed_logins = ?, locked_until = ? WHERE id = ?",
                (0 if locked_until else failures, locked_until, row["id"]),
            )
        raise generic
    return _open_session(row, remember)


def _open_session(row, remember):
    if row["status"] == "locked":
        raise AuthError("Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.", 403)
    with db() as conn:
        conn.execute("UPDATE accounts SET failed_logins = 0, locked_until = NULL WHERE id = ?", (row["id"],))
    return create_session(row["id"], remember), get_account(row["id"])


# ---- one-time codes (demo: no SMS is sent) -------------------------------------------------------

def _require_otp_enabled():
    if not DEMO_OTP:
        raise AuthError("Đăng nhập bằng mã OTP chưa khả dụng vì hệ thống chưa kết nối dịch vụ SMS. Vui lòng dùng email và mật khẩu.", 503)


def send_otp(phone):
    _require_otp_enabled()
    phone = clean_phone(phone)
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO otp_codes (phone, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)",
            (phone, hash_code(DEMO_OTP), _iso(_now() + timedelta(minutes=OTP_MINUTES))),
        )
    return {"registered": find_by_phone(phone) is not None, "expiresInSeconds": OTP_MINUTES * 60, "demo": True}


def check_otp(phone, code):
    _require_otp_enabled()
    phone = normalize_phone(phone)
    with db() as conn:
        row = conn.execute("SELECT * FROM otp_codes WHERE phone = ?", (phone,)).fetchone()
        if not row or row["expires_at"] < _iso(_now()) or row["attempts"] >= OTP_MAX_ATTEMPTS:
            raise AuthError("Mã OTP không đúng hoặc đã hết hạn.", 400)
        if hash_code(str(code or "")) != row["code_hash"]:
            conn.execute("UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?", (phone,))
            conn.commit()
            raise AuthError("Mã OTP không đúng hoặc đã hết hạn.", 400)
        conn.execute("DELETE FROM otp_codes WHERE phone = ?", (phone,))


def login_with_otp(phone, code, remember=True):
    check_otp(phone, code)
    row = find_by_phone(phone)
    if not row:
        raise AuthError("Số điện thoại này chưa đăng ký tài khoản.", 404)
    return _open_session(row, remember)


def reset_password(identifier, code, new_password):
    """Password reset with the one-time code of the account's phone (demo code, see DEMO_OTP)."""
    ident = str(identifier or "").strip()
    row = find_by_email(ident) if "@" in ident else find_by_phone(ident)
    if not row:
        raise AuthError("Không tìm thấy tài khoản với thông tin này.", 404)
    check_otp(row["phone"], code)
    check_password(new_password)
    set_password(row["id"], new_password, must_change=False)
    return _open_session(get_account(row["id"]), True)


def set_password(account_id, new_password, must_change=False):
    with db() as conn:
        conn.execute(
            "UPDATE accounts SET password_hash = ?, must_change_password = ?, failed_logins = 0, locked_until = NULL WHERE id = ?",
            (hash_password(new_password), 1 if must_change else 0, account_id),
        )
    revoke_account_sessions(account_id)


def change_password(account, current_password, new_password):
    if not verify_password(current_password or "", account["password_hash"]):
        raise AuthError("Mật khẩu hiện tại chưa đúng.", 400)
    check_password(new_password)
    if verify_password(new_password, account["password_hash"]):
        raise ValidationError("Mật khẩu mới cần khác mật khẩu hiện tại.")
    set_password(account["id"], new_password, must_change=False)
    return create_session(account["id"], True), get_account(account["id"])


# ---- admin operations ----------------------------------------------------------------------------

def list_accounts():
    with db() as conn:
        rows = conn.execute("SELECT * FROM accounts ORDER BY created_at DESC, rowid DESC").fetchall()
    return [public_account(r) for r in rows]


def set_status(account_id, status):
    if status not in ("active", "locked"):
        raise ValidationError("Trạng thái không hợp lệ.")
    with db() as conn:
        conn.execute("UPDATE accounts SET status = ? WHERE id = ?", (status, account_id))
    if status == "locked":
        revoke_account_sessions(account_id)


def set_plan(account_id, plan):
    with db() as conn:
        conn.execute("UPDATE accounts SET plan = ? WHERE id = ?", (plan, account_id))


def admin_create_parent(*, name, email, phone, plan="free"):
    """New parent account with its own random temporary password, which must be changed at first sign-in."""
    temp = temporary_password()
    row = create_account(name=name, email=email, phone=phone, password=temp, plan=plan, must_change_password=True)
    return row, temp


def admin_reset_password(account_id):
    row = get_account(account_id)
    if not row:
        raise AuthError("Không tìm thấy tài khoản.", 404)
    temp = temporary_password()
    set_password(account_id, temp, must_change=True)
    return temp


def delete_account(account_id):
    """Deletes a parent account together with its children and their practice data."""
    from .kids import delete_child  # local import: kids builds on accounts' tables

    with db() as conn:
        kid_ids = [r["id"] for r in conn.execute("SELECT id FROM children WHERE parent_id = ?", (account_id,))]
    for kid_id in kid_ids:
        delete_child(kid_id)
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE account_id = ?", (account_id,))
        conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
