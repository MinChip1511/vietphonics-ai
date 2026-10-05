"""Password hashing, session tokens and the FastAPI auth dependencies.

Passwords are hashed with scrypt (standard library, salted). Session tokens are random and only their
SHA-256 digest is stored, so a leaked database does not leak usable tokens.
"""
import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException

from .database import clean, col, now_iso, utc_now

_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1}
SESSION_DAYS_REMEMBERED = 30
SESSION_HOURS_DEFAULT = 12


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, dklen=32, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex), dklen=32, **_SCRYPT)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_code(code: str) -> str:
    return hashlib.sha256(f"otp:{code}".encode("utf-8")).hexdigest()


def create_session(account_id: str, remember: bool = True) -> str:
    token = secrets.token_urlsafe(32)
    lifetime = timedelta(days=SESSION_DAYS_REMEMBERED) if remember else timedelta(hours=SESSION_HOURS_DEFAULT)
    col("sessions").insert_one({
        "_id": hash_token(token),
        "account_id": account_id,
        "created_at": now_iso(),
        "expires_at": utc_now() + lifetime,  # TTL index removes the document after this moment
    })
    return token


def revoke_session(token: str) -> None:
    col("sessions").delete_one({"_id": hash_token(token)})


def revoke_account_sessions(account_id: str) -> None:
    col("sessions").delete_many({"account_id": account_id})


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    return value.strip() if scheme.lower() == "bearer" and value.strip() else None


def account_for_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    session = col("sessions").find_one({"_id": hash_token(token), "expires_at": {"$gt": utc_now()}})
    if not session:
        return None
    return clean(col("accounts").find_one({"_id": session["account_id"]}))


def current_account(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency: the signed-in account, or 401. Locked accounts are rejected too."""
    account = account_for_token(_bearer(authorization))
    if not account:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tiếp tục")
    if account["status"] == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa")
    return account


def admin_account(account: dict = Depends(current_account)) -> dict:
    if account["role"] != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập khu vực quản trị")
    return account


def token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    return _bearer(authorization)
