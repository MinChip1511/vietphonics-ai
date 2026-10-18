"""Sending email: one function, several providers chosen by EMAIL_PROVIDER (see config.py).

`memory` (tests only) collects messages in OUTBOX instead of sending them.
"""
import json
import logging
import smtplib
import socket
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

from . import config

log = logging.getLogger("vietphonics.email")
OUTBOX = []  # used by the `memory` provider


class EmailUnavailable(Exception):
    """Email cannot be sent (provider not configured, or the provider refused/failed)."""


def configured() -> bool:
    provider = config.EMAIL_PROVIDER
    if provider in ("console", "memory"):
        return True
    if provider == "smtp":
        return bool(config.SMTP_USER and config.SMTP_PASSWORD)
    if provider == "brevo":
        return bool(config.BREVO_API_KEY and (config.EMAIL_FROM or config.SMTP_USER))
    return False


def _sender():
    return config.EMAIL_FROM or config.SMTP_USER


def send_email(to: str, subject: str, text: str, html: str = None) -> None:
    provider = config.EMAIL_PROVIDER
    if not configured():
        raise EmailUnavailable("email provider is not configured")
    if provider == "memory":
        OUTBOX.append({"to": to, "subject": subject, "text": text, "html": html})
    elif provider == "console":
        log.warning("EMAIL to %s | %s\n%s", to, subject, text)
    elif provider == "smtp":
        _send_smtp(to, subject, text, html)
    elif provider == "brevo":
        _send_brevo(to, subject, text, html)
    else:
        raise EmailUnavailable(f"unknown EMAIL_PROVIDER {provider!r}")


def _connect_ipv4(host, port, timeout):
    """Open the TCP connection over IPv4 only: some hosts (Render) have no IPv6 route, and the default
    resolution can pick an IPv6 address first and fail with "Network is unreachable"."""
    last = None
    for family, kind, proto, _, address in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
        sock = socket.socket(family, kind, proto)
        sock.settimeout(timeout)
        try:
            sock.connect(address)
            return sock
        except OSError as exc:
            sock.close()
            last = OSError(f"{exc} (to {address[0]}:{port})")
    raise last or OSError(f"no IPv4 address for {host}")


def _ipv4_client(base):
    """`base` (smtplib.SMTP or SMTP_SSL, looked up when a mail is sent) with the IPv4-only connection."""
    class Client(base):
        def _get_socket(self, host, port, timeout):
            sock = _connect_ipv4(host, port, timeout)
            if base is smtplib.SMTP_SSL:
                return self.context.wrap_socket(sock, server_hostname=self._host)
            return sock

    return Client


def _send_smtp(to, subject, text, html):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((config.EMAIL_FROM_NAME, _sender()))
    message["To"] = to
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    context = ssl.create_default_context()
    try:
        if config.SMTP_PORT == 465:
            with _ipv4_client(smtplib.SMTP_SSL)(config.SMTP_HOST, config.SMTP_PORT, timeout=15, context=context) as server:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.send_message(message)
        else:
            with _ipv4_client(smtplib.SMTP)(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
                server.starttls(context=context)
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        raise EmailUnavailable(f"SMTP failed: {exc}") from exc


def _send_brevo(to, subject, text, html):
    payload = {
        "sender": {"name": config.EMAIL_FROM_NAME, "email": _sender()},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": text,
    }
    if html:
        payload["htmlContent"] = html
    request = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode(),
        headers={"api-key": config.BREVO_API_KEY, "content-type": "application/json", "accept": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=15).read()
    except (urllib.error.URLError, OSError) as exc:
        raise EmailUnavailable(f"Brevo failed: {exc}") from exc
