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


ENV = _env("VIETPHONICS_ENV", "development").lower()
PRODUCTION = ENV == "production"

DB_PATH = Path(_env("VIETPHONICS_DB", BACKEND_DIR / "vietphonics.db"))
UPLOAD_DIR = Path(_env("VIETPHONICS_UPLOADS", BACKEND_DIR / "uploads"))
VOCAB_PATH = Path(_env("VIETPHONICS_VOCAB", REPO_ROOT / "vocab.json"))
MODEL_PATH = Path(_env("VIETPHONICS_MODEL", REPO_ROOT / "papl_nccf_vietmdd.pt"))

ADMIN_EMAIL = _env("VIETPHONICS_ADMIN_EMAIL", "admin@vietphonics.vn")
ADMIN_PASSWORD = _env("VIETPHONICS_ADMIN_PASSWORD")

# No SMS provider is connected. A one-time code exists only when VIETPHONICS_DEMO_OTP is set, or in
# development (default 123456). In production without it, phone-code sign-in and password reset are off:
# a fixed code would let anyone take over any account by knowing its phone number.
DEMO_OTP = _env("VIETPHONICS_DEMO_OTP", None if PRODUCTION else "123456")

# Browsers on another origin than the API (e.g. Vercel calling Render directly) must be listed here.
# With the Vercel "/api" rewrite (frontend/vercel.json) the browser stays same-origin and none is needed.
CORS_ORIGINS = [o.strip() for o in (_env("VIETPHONICS_CORS", "" if PRODUCTION else "*")).split(",") if o.strip()]

# Load the model in a background thread so the server answers health checks while it warms up.
MODEL_BACKGROUND_LOAD = _env("VIETPHONICS_MODEL_BACKGROUND", "1") == "1"
