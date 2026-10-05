"""Sign-up, sign-in, one-time codes and password endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import accounts
from ..ratelimit import limit_by_ip
from ..security import current_account, revoke_session, token_from_header

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterBody(BaseModel):
    name: str
    email: str
    phone: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str
    remember: bool = True


class OtpSendBody(BaseModel):
    phone: str


class OtpLoginBody(BaseModel):
    phone: str
    code: str
    remember: bool = True


class ResetBody(BaseModel):
    identifier: str
    code: str
    new_password: str


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


def _session(token, row):
    return {"token": token, "user": accounts.public_account(row)}


@router.post("/register", status_code=201, dependencies=[limit_by_ip("register", 20, 3600)])
def register(body: RegisterBody):
    row = accounts.create_account(name=body.name, email=body.email, phone=body.phone, password=body.password)
    token, row = accounts.login_with_password(row["email"], body.password)
    return _session(token, row)


@router.post("/login", dependencies=[limit_by_ip("login", 60, 600)])
def login(body: LoginBody):
    token, row = accounts.login_with_password(body.email, body.password, body.remember)
    return _session(token, row)


@router.post("/otp/send", dependencies=[limit_by_ip("otp", 10, 600)])
def otp_send(body: OtpSendBody):
    return accounts.send_otp(body.phone)


@router.post("/otp/login", dependencies=[limit_by_ip("otp", 10, 600)])
def otp_login(body: OtpLoginBody):
    token, row = accounts.login_with_otp(body.phone, body.code, body.remember)
    return _session(token, row)


@router.post("/password/reset", dependencies=[limit_by_ip("otp", 10, 600)])
def password_reset(body: ResetBody):
    token, row = accounts.reset_password(body.identifier, body.code, body.new_password)
    return _session(token, row)


@router.post("/password/change")
def password_change(body: ChangePasswordBody, account: dict = Depends(current_account)):
    token, row = accounts.change_password(account, body.current_password, body.new_password)
    return _session(token, row)


@router.get("/me")
def me(account: dict = Depends(current_account)):
    return {"user": accounts.public_account(account)}


@router.post("/logout")
def logout(token: Optional[str] = Depends(token_from_header)):
    if token:
        revoke_session(token)
    return {"status": "ok"}


@router.get("/availability", dependencies=[limit_by_ip("availability", 120, 60)])
def availability(email: Optional[str] = None, phone: Optional[str] = None):
    """Lets the sign-up form say early that an email or phone is taken (this reveals nothing the
    register endpoint would not reveal anyway)."""
    return {
        "emailTaken": bool(email and accounts.find_by_email(email)),
        "phoneTaken": bool(phone and accounts.find_by_phone(phone)),
    }
