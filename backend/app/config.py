"""Deployment settings, all from environment variables (see backend/.env.example).

Nothing here is secret-by-default: production refuses to invent credentials or demo codes.
"""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


def _env(name, default=None):
    value = os.environ.get(name)
    return value if value not in (None, "") else default


# Fail closed: anything but an explicit "development" (or "test") is production, so a deployment that forgets
# to set the variable never gets demo accounts, a fixed OTP or open CORS.
ENV = _env("VIETPHONICS_ENV", "production").lower()
PRODUCTION = ENV not in ("development", "dev", "test")

# MongoDB (Atlas "mongodb+srv://..." in production). "mongomock://" is an in-memory database for tests and
# quick local runs; it is refused in production. The default only suits a local mongod.
MONGODB_URI = _env("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DB = _env("MONGODB_DB", "vietphonics")
VOCAB_PATH = Path(_env("VIETPHONICS_VOCAB", REPO_ROOT / "vocab.json"))
MODEL_PATH = Path(_env("VIETPHONICS_MODEL", REPO_ROOT / "papl_nccf_vietmdd.pt"))

ADMIN_EMAIL = _env("VIETPHONICS_ADMIN_EMAIL", "admin@vietphonics.vn")
ADMIN_PASSWORD = _env("VIETPHONICS_ADMIN_PASSWORD")

# One-time codes (email sign-in, password reset) are random per request and sent by email.
#   EMAIL_PROVIDER = smtp     SMTP_USER / SMTP_PASSWORD (e.g. a Gmail app password), SMTP_HOST, SMTP_PORT
#                  = brevo    BREVO_API_KEY
#                  = console  prints the mail in the log (development default)
#                  = none     codes are off: the endpoints answer 503 (production default until configured)
# EMAIL_FROM is the sender address (defaults to SMTP_USER).
EMAIL_PROVIDER = _env("EMAIL_PROVIDER", "none" if PRODUCTION else "console").lower()
EMAIL_FROM = _env("EMAIL_FROM")
EMAIL_FROM_NAME = _env("EMAIL_FROM_NAME", "VietPhonics AI")
SMTP_HOST = _env("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", 465))  # 465 = SSL, 587 = STARTTLS
SMTP_USER = _env("SMTP_USER")
SMTP_PASSWORD = _env("SMTP_PASSWORD")
BREVO_API_KEY = _env("BREVO_API_KEY")

# Browsers on another origin than the API (e.g. Vercel calling Render directly) must be listed here.
# With the Vercel "/api" rewrite (frontend/vercel.json) the browser stays same-origin and none is needed.
CORS_ORIGINS = [o.strip() for o in (_env("VIETPHONICS_CORS", "" if PRODUCTION else "*")).split(",") if o.strip()]

# Scoring limits: one 6-second WAV is ~200 KB; the model runs one request at a time by default.
MAX_AUDIO_BYTES = int(_env("VIETPHONICS_MAX_AUDIO_BYTES", 1_000_000))
ANALYZE_CONCURRENCY = int(_env("VIETPHONICS_ANALYZE_CONCURRENCY", 1))
ANALYZE_WAIT_SECONDS = float(_env("VIETPHONICS_ANALYZE_WAIT", 20))

# Load the model in a background thread so the server answers health checks while it warms up.
MODEL_BACKGROUND_LOAD = _env("VIETPHONICS_MODEL_BACKGROUND", "1") == "1"
