"""Checks that the backend behaves safely in production mode (throwaway DB, no model loaded).

Run from the repo root:  backend/venv/bin/python scripts/test_production.py
Covers what a deployment must guarantee: no demo accounts or demo codes, the admin comes from the
environment, API docs are off, CORS only for the configured origin, health answers while the model is
still loading, and scoring answers 503 (not a fake score) when the model is not available.
"""
import os
import sys
from pathlib import Path

os.environ.update({
    "VIETPHONICS_ENV": "production",
    "MONGODB_URI": "mongomock://",  # production refuses this (see the first case); the test injects a handle instead
    "VIETPHONICS_ADMIN_EMAIL": "owner@vietphonics.example",
    "VIETPHONICS_ADMIN_PASSWORD": "Owner-Pass-12345",
    "VIETPHONICS_CORS": "https://app.vercel.example",
})
os.environ.pop("VIETPHONICS_DEMO_OTP", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

import mongomock  # noqa: E402

from backend.app import database  # noqa: E402
from backend.app.main import app  # noqa: E402

try:  # production must never fall back to the in-memory database
    database.get_db()
    refused = False
except RuntimeError:
    refused = True
assert refused, "production accepted mongomock://"
database._database = mongomock.MongoClient()["vp_prod_test"]  # test-only handle, bypassing the guard
database.init_db()
client = TestClient(app)  # no lifespan: the model is not loaded
CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def login(email, password):
    return client.post("/api/auth/login", json={"email": email, "password": password})


@case
def an_unset_environment_means_production():
    import subprocess

    env = {k: v for k, v in os.environ.items() if not k.startswith("VIETPHONICS_")}
    out = subprocess.run([sys.executable, "-c", "from backend.app import config; print(config.PRODUCTION, config.DEMO_OTP, config.CORS_ORIGINS)"],
                         env=env, capture_output=True, text=True, cwd=Path(__file__).resolve().parent.parent)
    assert out.stdout.strip() == "True None []", out.stdout + out.stderr


@case
def no_demo_accounts_exist():
    assert login("phuhuynh@vietphonics.vn", "123456").status_code == 401
    assert login("admin@vietphonics.vn", "admin123").status_code == 401


@case
def admin_comes_from_the_environment():
    r = login("owner@vietphonics.example", "Owner-Pass-12345")
    assert r.status_code == 200 and r.json()["user"]["role"] == "admin", r.text
    token = r.json()["token"]
    data = client.get("/api/admin/bootstrap", headers={"Authorization": f"Bearer {token}"}).json()
    assert len(data["accounts"]) == 1 and not data["accounts"][0]["isDemo"]
    assert data["unownedChildren"] == [] and data["orders"] == []


@case
def reference_data_is_seeded_without_demo_content():
    assert len(client.get("/api/lessons").json()["lessons"]) >= 10
    assert [p["id"] for p in client.get("/api/plans").json()] == ["free", "basic", "premium", "family"]


@case
def phone_code_signin_and_reset_are_off_without_an_sms_provider():
    assert client.post("/api/auth/otp/send", json={"phone": "0912345678"}).status_code == 503
    assert client.post("/api/auth/otp/login", json={"phone": "0912345678", "code": "123456"}).status_code == 503
    r = client.post("/api/auth/password/reset", json={"identifier": "owner@vietphonics.example", "code": "123456", "new_password": "Newpass123"})
    assert r.status_code == 503
    assert login("owner@vietphonics.example", "Owner-Pass-12345").status_code == 200  # password unchanged


@case
def api_docs_are_not_exposed():
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404, path


@case
def cors_only_allows_the_configured_origin():
    ok = client.get("/api/health", headers={"Origin": "https://app.vercel.example"})
    assert ok.headers.get("access-control-allow-origin") == "https://app.vercel.example"
    other = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


@case
def health_answers_while_the_model_is_not_loaded():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "healthy" and r.json()["model_loaded"] is False


@case
def scoring_is_unavailable_not_faked_without_the_model():
    token = client.post("/api/auth/register", json={"name": "Phu Huynh", "email": "p@x.vn", "phone": "0987000111", "password": "Abcdefg1"}).json()["token"]
    import io
    import wave
    import struct
    import math
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:  # speech-like: 200 Hz bursts over near silence, so it passes the noise gate
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        samples = (int(6000 * max(0, math.sin(2 * math.pi * 1.5 * i / 16000)) * math.sin(2 * math.pi * 200 * i / 16000)) for i in range(32000))
        w.writeframes(b"".join(struct.pack("<h", v) for v in samples))
    h = {"Authorization": f"Bearer {token}"}
    child = client.post("/api/profiles", headers=h, json={"name": "Be Thu", "age": 5}).json()["id"]
    word = client.get("/api/lessons/lesson-0").json()["words"][0]["id"]
    form = {"child_id": child, "lesson_id": "lesson-0", "word_id": word}
    r = client.post("/api/analyze-audio", headers=h, files={"audio": ("a.wav", buf.getvalue(), "audio/wav")}, data=form)
    assert r.status_code == 503, r.text
    anonymous = client.post("/api/analyze-audio", files={"audio": ("a.wav", b"x", "audio/wav")}, data=form)
    assert anonymous.status_code == 401


@case
def admin_cannot_be_locked_or_deleted_through_the_parent_routes():
    token = login("owner@vietphonics.example", "Owner-Pass-12345").json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    admin_id = next(a["id"] for a in client.get("/api/admin/bootstrap", headers=h).json()["accounts"] if a["role"] == "admin")
    assert client.patch(f"/api/admin/accounts/{admin_id}", headers=h, json={"status": "locked"}).status_code == 404
    assert client.delete(f"/api/admin/accounts/{admin_id}", headers=h).status_code == 404


@case
def uploaded_reward_images_are_served():
    token = login("owner@vietphonics.example", "Owner-Pass-12345").json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    rid = client.post("/api/admin/rewards", headers=h, json={"title": "Thử", "kind": "Huy hiệu", "cost": 5}).json()["id"]
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 32
    url = client.post(f"/api/admin/rewards/{rid}/image", headers=h, files={"image": ("a.png", png, "image/png")}).json()["image"]
    served = client.get(url)
    assert served.status_code == 200 and served.content == png


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
