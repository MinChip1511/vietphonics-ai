"""The email providers, without a network: SMTP and Brevo are replaced by fakes that record what would be sent.

Run from the repo root:  backend/venv/bin/python scripts/test_email.py
"""
import json
import smtplib
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import config, email_service  # noqa: E402

CASES = []


def case(fn):
    CASES.append(fn)
    return fn


class FakeSMTP:
    sent = []
    logins = []
    starttls_called = False

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port = host, port

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        FakeSMTP.starttls_called = True

    def login(self, user, password):
        FakeSMTP.logins.append((self.host, self.port, user, password))

    def send_message(self, message):
        FakeSMTP.sent.append(message)


def configure(**values):
    for key, value in values.items():
        setattr(config, key, value)


@case
def smtp_sends_a_utf8_mail_over_ssl_with_the_app_password():
    FakeSMTP.sent.clear(); FakeSMTP.logins.clear()
    original = smtplib.SMTP_SSL
    smtplib.SMTP_SSL = FakeSMTP
    configure(EMAIL_PROVIDER="smtp", SMTP_HOST="smtp.gmail.com", SMTP_PORT=465, SMTP_USER="me@gmail.com", SMTP_PASSWORD="abcd efgh ijkl mnop", EMAIL_FROM=None)
    try:
        email_service.send_email("parent@example.com", "Mã xác thực VietPhonics AI: 123456", "Mã của bạn là 123456", "<p>123456</p>")
    finally:
        smtplib.SMTP_SSL = original
    assert FakeSMTP.logins == [("smtp.gmail.com", 465, "me@gmail.com", "abcd efgh ijkl mnop")]
    mail = FakeSMTP.sent[0]
    assert mail["To"] == "parent@example.com" and "me@gmail.com" in mail["From"] and "VietPhonics AI" in mail["From"]
    assert "123456" in mail.get_body(("plain",)).get_content() and "123456" in mail.get_body(("html",)).get_content()


@case
def smtp_on_port_587_uses_starttls():
    FakeSMTP.sent.clear(); FakeSMTP.starttls_called = False
    original = smtplib.SMTP
    smtplib.SMTP = FakeSMTP
    configure(EMAIL_PROVIDER="smtp", SMTP_PORT=587)
    try:
        email_service.send_email("parent@example.com", "x", "y")
    finally:
        smtplib.SMTP = original
    assert FakeSMTP.starttls_called and len(FakeSMTP.sent) == 1


@case
def smtp_failures_become_email_unavailable():
    class Broken(FakeSMTP):
        def login(self, user, password):
            raise smtplib.SMTPAuthenticationError(535, b"bad credentials")

    original = smtplib.SMTP_SSL
    smtplib.SMTP_SSL = Broken
    configure(EMAIL_PROVIDER="smtp", SMTP_PORT=465)
    try:
        try:
            email_service.send_email("parent@example.com", "x", "y")
            raise AssertionError("expected EmailUnavailable")
        except email_service.EmailUnavailable:
            pass
    finally:
        smtplib.SMTP_SSL = original


@case
def brevo_posts_to_the_transactional_api_with_the_key():
    seen = {}

    class Response:
        def read(self):
            return b"{}"

    def fake_urlopen(request, timeout=None):
        seen["url"], seen["headers"], seen["body"] = request.full_url, dict(request.header_items()), json.loads(request.data)
        return Response()

    original = urllib.request.urlopen
    urllib.request.urlopen = fake_urlopen
    configure(EMAIL_PROVIDER="brevo", BREVO_API_KEY="xkeysib-test", EMAIL_FROM="sender@example.com")
    try:
        email_service.send_email("parent@example.com", "Chủ đề", "nội dung", "<p>nội dung</p>")
    finally:
        urllib.request.urlopen = original
    assert seen["url"] == "https://api.brevo.com/v3/smtp/email"
    assert seen["headers"]["Api-key"] == "xkeysib-test"
    assert seen["body"]["sender"]["email"] == "sender@example.com" and seen["body"]["to"] == [{"email": "parent@example.com"}]


@case
def an_unconfigured_provider_refuses_to_send():
    for values in ({"EMAIL_PROVIDER": "none"}, {"EMAIL_PROVIDER": "smtp", "SMTP_USER": None, "SMTP_PASSWORD": None}, {"EMAIL_PROVIDER": "brevo", "BREVO_API_KEY": None}):
        configure(**values)
        assert not email_service.configured()
        try:
            email_service.send_email("a@b.co", "x", "y")
            raise AssertionError("expected EmailUnavailable")
        except email_service.EmailUnavailable:
            pass


if __name__ == "__main__":
    failed = 0
    for fn in CASES:
        try:
            fn()
            print(f"ok    {fn.__name__}")
        except Exception as exc:  # noqa: BLE001 - report every failing case
            failed += 1
            print(f"FAIL  {fn.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    sys.exit(1 if failed else 0)
