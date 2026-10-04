"""Server-side input rules. The same rules run in the browser (frontend/src/services/validators.js),
but only these count: the browser can be bypassed."""
import re

from .name_filter import is_inappropriate

MAX_NAME_LENGTH = 30
PHONE_ERROR = "Số điện thoại gồm đúng 10 chữ số, bắt đầu bằng số 0."
PASSWORD_HINT = "Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số."
NAME_ERROR = "Tên này có từ chưa phù hợp. Vui lòng chọn tên khác."
_PHONE = re.compile(r"^0\d{9}$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(ValueError):
    """Carries a message that is safe to show to the user."""


def normalize_phone(value) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if digits.startswith("84") and len(digits) == 11:
        return "0" + digits[2:]
    return digits


def clean_name(value, label="tên") -> str:
    name = re.sub(r"\s+", " ", str(value or "")).strip()
    if not name:
        raise ValidationError(f"Vui lòng nhập {label}.")
    if len(name) > MAX_NAME_LENGTH:
        raise ValidationError(f"Tên chỉ tối đa {MAX_NAME_LENGTH} ký tự.")
    if is_inappropriate(name):
        raise ValidationError(NAME_ERROR)
    return name


def clean_phone(value) -> str:
    phone = normalize_phone(value)
    if not _PHONE.match(phone):
        raise ValidationError(PHONE_ERROR)
    return phone


def clean_email(value) -> str:
    email = str(value or "").strip().lower()
    if not _EMAIL.match(email) or len(email) > 120:
        raise ValidationError("Email chưa đúng định dạng.")
    return email


def check_password(value) -> str:
    pw = str(value or "")
    if len(pw) < 8 or not re.search(r"[a-zà-ỹ]", pw) or not re.search(r"[A-ZÀ-Ỹ]", pw) or not re.search(r"\d", pw):
        raise ValidationError(f"Mật khẩu chưa đủ mạnh. {PASSWORD_HINT}")
    if len(pw) > 128:
        raise ValidationError("Mật khẩu quá dài.")
    return pw
