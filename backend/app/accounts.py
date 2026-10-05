"""Accounts, sign-in, one-time codes and password changes."""
import logging
import secrets
import string
import uuid
from datetime import timedelta

from pymongo.errors import DuplicateKeyError

from . import email_service
from .database import clean, clean_all, col, iso, now_iso, utc_now
from .security import (
    create_session, hash_code, hash_password, revoke_account_sessions, verify_password,
)
from .validation import (
    ValidationError, check_password, clean_email, clean_name, clean_phone, normalize_phone,
)

log = logging.getLogger("vietphonics.accounts")
MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15
OTP_MINUTES = 5
OTP_MAX_ATTEMPTS = 5


class AuthError(Exception):
    def __init__(self, message, status=401):
        super().__init__(message)
        self.message = message
        self.status = status


def public_account(row, kids=None) -> dict:
    """The account as the client may see it (never the hash). `kids` saves a query when listing many."""
    if kids is None:
        kids = [c["_id"] for c in col("children").find({"parent_id": row["id"]}, {"_id": 1}).sort("created_at", 1)]
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
    return clean(col("accounts").find_one({"_id": account_id}))


def find_by_email(email):
    return clean(col("accounts").find_one({"email": str(email).strip().lower()}))


def find_by_phone(phone):
    return clean(col("accounts").find_one({"phone": normalize_phone(phone)}))


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
    try:
        col("accounts").insert_one({
            "_id": account_id, "role": role, "name": name, "email": email, "phone": phone,
            "password_hash": hash_password(password), "plan": plan, "status": "active",
            "must_change_password": bool(must_change_password), "failed_logins": 0, "locked_until": None,
            "is_demo": bool(is_demo), "created_at": now_iso(),
        })
    except DuplicateKeyError:  # two sign-ups raced past the checks above; the unique indexes decide
        raise AuthError("Email hoặc số điện thoại này đã được đăng ký.", 409)
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
    if row["locked_until"] and row["locked_until"] > now_iso():
        raise AuthError("Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.", 429)
    if not verify_password(password or "", row["password_hash"]):
        failures = row["failed_logins"] + 1
        locked_until = iso(utc_now() + timedelta(minutes=LOCKOUT_MINUTES)) if failures >= MAX_FAILED_LOGINS else None
        col("accounts").update_one(
            {"_id": row["id"]},
            {"$set": {"failed_logins": 0 if locked_until else failures, "locked_until": locked_until}},
        )
        raise generic
    return _open_session(row, remember)


def _open_session(row, remember):
    if row["status"] == "locked":
        raise AuthError("Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.", 403)
    col("accounts").update_one({"_id": row["id"]}, {"$set": {"failed_logins": 0, "locked_until": None}})
    return create_session(row["id"], remember), get_account(row["id"])


# ---- one-time codes, sent by email -----------------------------------------------------------------

CODE_PURPOSES = ("login", "reset")
GENERIC_BAD_CODE = "Mã xác thực không đúng hoặc đã hết hạn."


def send_code(email, purpose):
    """Email a fresh random 6-digit code. It never reveals whether the email has an account: unknown or
    locked accounts get the same answer and simply no message. Raises AuthError(503) when email is not set up."""
    if purpose not in CODE_PURPOSES:
        raise ValidationError("Yêu cầu không hợp lệ.")
    email = clean_email(email)
    if not email_service.configured():
        raise AuthError("Gửi mã qua email chưa khả dụng. Vui lòng đăng nhập bằng email và mật khẩu.", 503)
    row = find_by_email(email)
    if row and row["status"] != "locked":
        code = f"{secrets.randbelow(10 ** 6):06d}"
        col("otp_codes").replace_one(
            {"_id": email},
            {"_id": email, "purpose": purpose, "code_hash": hash_code(code),
             "expires_at": iso(utc_now() + timedelta(minutes=OTP_MINUTES)), "attempts": 0},
            upsert=True,
        )
        what = "đăng nhập" if purpose == "login" else "đặt lại mật khẩu"
        try:
            email_service.send_email(
                email,
                f"Mã xác thực VietPhonics AI: {code}",
                f"Mã {what} của bạn là {code}.\nMã có hiệu lực {OTP_MINUTES} phút và chỉ dùng một lần.\n"
                "Nếu bạn không yêu cầu, hãy bỏ qua email này; tài khoản của bạn vẫn an toàn.",
                f"<p>Mã {what} của bạn là:</p><p style=\"font-size:28px;font-weight:bold;letter-spacing:4px\">{code}</p>"
                f"<p>Mã có hiệu lực {OTP_MINUTES} phút và chỉ dùng một lần.</p>"
                "<p style=\"color:#666\">Nếu bạn không yêu cầu, hãy bỏ qua email này; tài khoản của bạn vẫn an toàn.</p>",
            )
        except email_service.EmailUnavailable:
            log.exception("Could not send a verification email")  # same answer to the caller: no leak
    return {"sent": True, "expiresInSeconds": OTP_MINUTES * 60}


def check_code(email, code, purpose):
    email = str(email or "").strip().lower()
    row = col("otp_codes").find_one({"_id": email})
    bad = AuthError(GENERIC_BAD_CODE, 400)
    if not row or row.get("purpose") != purpose or row["expires_at"] < now_iso() or row["attempts"] >= OTP_MAX_ATTEMPTS:
        raise bad
    if hash_code(str(code or "").strip()) != row["code_hash"]:
        col("otp_codes").update_one({"_id": email}, {"$inc": {"attempts": 1}})
        raise bad
    col("otp_codes").delete_one({"_id": email})  # one use only


def login_with_code(email, code, remember=True):
    check_code(email, code, "login")
    row = find_by_email(email)
    if not row:
        raise AuthError(GENERIC_BAD_CODE, 400)
    return _open_session(row, remember)


def reset_password(email, code, new_password):
    """Password reset with the code emailed to the account."""
    check_password(new_password)  # first: a weak password must not burn the one-time code
    check_code(email, code, "reset")
    row = find_by_email(email)
    if not row:
        raise AuthError(GENERIC_BAD_CODE, 400)
    set_password(row["id"], new_password, must_change=False)
    return _open_session(get_account(row["id"]), True)


def set_password(account_id, new_password, must_change=False):
    col("accounts").update_one(
        {"_id": account_id},
        {"$set": {"password_hash": hash_password(new_password), "must_change_password": bool(must_change),
                  "failed_logins": 0, "locked_until": None}},
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
    kids = {}
    for child in col("children").find({}, {"parent_id": 1}).sort("created_at", 1):
        kids.setdefault(child.get("parent_id"), []).append(child["_id"])
    return [public_account(r, kids.get(r["id"], [])) for r in clean_all(col("accounts").find().sort("created_at", -1))]


def set_status(account_id, status):
    if status not in ("active", "locked"):
        raise ValidationError("Trạng thái không hợp lệ.")
    col("accounts").update_one({"_id": account_id}, {"$set": {"status": status}})
    if status == "locked":
        revoke_account_sessions(account_id)


def set_plan(account_id, plan):
    col("accounts").update_one({"_id": account_id}, {"$set": {"plan": plan}})


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
    from .kids import delete_child  # local import: kids builds on accounts' collections

    for kid in col("children").find({"parent_id": account_id}, {"_id": 1}):
        delete_child(kid["_id"])
    revoke_account_sessions(account_id)
    col("accounts").delete_one({"_id": account_id})
