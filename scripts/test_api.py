"""API tests on an in-memory MongoDB (mongomock; no model is loaded, no server needed).

Run from the repo root:  backend/venv/bin/python scripts/test_api.py
Covers the bug-report items B6 (family isolation), M7/M8/M9 (account admin), M13/M14/M16/M17 (shared
content), M1/M2 (one points balance, no points for failed words) and the admin/parent boundary.
"""
import os
import sys
import uuid
from pathlib import Path

# Default: in-memory MongoDB (mongomock), nothing to install. To run the same suite against a real server
# (e.g. an Atlas cluster) set TEST_MONGODB_URI; it uses a throw-away database that is dropped at the end.
LIVE_URI = os.environ.get("TEST_MONGODB_URI")
os.environ["MONGODB_URI"] = LIVE_URI or "mongomock://"
os.environ["MONGODB_DB"] = f"vp_test_{uuid.uuid4().hex[:8]}"
os.environ["VIETPHONICS_ENV"] = "development"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.database import init_db  # noqa: E402
from backend.app.kids import record_attempt  # noqa: E402
from backend.app.main import app  # noqa: E402

init_db()
client = TestClient(app)  # not used as a context manager: the lifespan would load the model
CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def login(email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def register(n):
    r = client.post("/api/auth/register", json={"name": f"Phu Huynh {n}", "email": f"p{n}@x.vn", "phone": f"08{n:08d}", "password": "Abcdefg1"})
    assert r.status_code == 201, r.text
    return r.json()["token"], r.json()["user"]


PARENT = ("phuhuynh@vietphonics.vn", "123456")
ADMIN = ("admin@vietphonics.vn", "admin123")


@case
def anonymous_cannot_read_children_or_admin():
    assert client.get("/api/profiles").status_code == 401
    assert client.get("/api/admin/bootstrap").status_code == 401


@case
def family_isolation_B6():
    tok, _ = register(1)
    assert client.get("/api/profiles", headers=auth(tok)).json() == []
    ptok, _ = login(*PARENT)
    mine = client.get("/api/profiles", headers=auth(ptok)).json()
    assert {c["id"] for c in mine} == {"child-minh", "child-an"}
    for path in ("/api/profiles/child-minh", "/api/profiles/child-minh/rewards", "/api/practice-history?child_id=child-minh"):
        assert client.get(path, headers=auth(tok)).status_code == 404, path
    assert client.patch("/api/profiles/child-minh", headers=auth(tok), json={"name": "Hacked"}).status_code == 404
    assert client.delete("/api/profiles/child-minh", headers=auth(tok)).status_code == 404


@case
def parent_cannot_use_admin_api():
    tok, _ = login(*PARENT)
    assert client.get("/api/admin/bootstrap", headers=auth(tok)).status_code == 403
    assert client.post("/api/admin/lessons", headers=auth(tok), json={}).status_code == 403


@case
def child_validation_and_name_filter_B5():
    tok, _ = register(2)
    h = auth(tok)
    assert client.post("/api/profiles", headers=h, json={"name": "nigga", "age": 5}).status_code == 422
    assert client.post("/api/profiles", headers=h, json={"name": "Bé Na", "age": 9}).status_code == 422
    r = client.post("/api/profiles", headers=h, json={"name": "Bé Na", "age": 5})
    assert r.status_code == 201 and r.json()["stars"] == 0 and r.json()["completed_lessons"] == 0, r.text
    assert client.patch(f"/api/profiles/{r.json()['id']}", headers=h, json={"name": "đụ má"}).status_code == 422


@case
def settings_are_validated_and_saved_per_child():
    tok, _ = register(3)
    h = auth(tok)
    cid = client.post("/api/profiles", headers=h, json={"name": "Bé Mi", "age": 6}).json()["id"]
    r = client.patch(f"/api/profiles/{cid}", headers=h, json={"settings": {"region": "south", "sensitivity": 70}})
    assert r.json()["settings"]["region"] == "south" and r.json()["settings"]["consentAnalysis"] is True
    assert client.patch(f"/api/profiles/{cid}", headers=h, json={"settings": {"region": "mars"}}).status_code == 422


@case
def locked_account_stays_listed_and_can_be_unlocked_M7():
    atok, _ = login(*ADMIN)
    _, user = register(4)
    h = auth(atok)
    assert client.patch(f"/api/admin/accounts/{user['id']}", headers=h, json={"status": "locked"}).json()["status"] == "locked"
    listed = {a["id"]: a for a in client.get("/api/admin/bootstrap", headers=h).json()["accounts"]}
    assert listed[user["id"]]["status"] == "locked"
    assert client.post("/api/auth/login", json={"email": "p4@x.vn", "password": "Abcdefg1"}).status_code == 403
    client.patch(f"/api/admin/accounts/{user['id']}", headers=h, json={"status": "active"})
    login("p4@x.vn", "Abcdefg1")


@case
def duplicate_email_or_phone_is_rejected_M8():
    atok, _ = login(*ADMIN)
    h = auth(atok)
    base = {"name": "Nguoi Moi", "email": "moi@x.vn", "phone": "0987654321"}
    assert client.post("/api/admin/accounts", headers=h, json=base).status_code == 201
    assert client.post("/api/admin/accounts", headers=h, json=base).status_code == 409
    assert client.post("/api/admin/accounts", headers=h, json={**base, "email": "khac@x.vn"}).status_code == 409
    assert client.post("/api/admin/accounts", headers=h, json={**base, "email": "k2@x.vn", "phone": "123"}).status_code == 422


@case
def temporary_passwords_are_unique_work_and_force_a_change_M9():
    atok, _ = login(*ADMIN)
    h = auth(atok)
    a = client.post("/api/admin/accounts", headers=h, json={"name": "A Tam", "email": "a1@x.vn", "phone": "0911000001"}).json()
    b = client.post("/api/admin/accounts", headers=h, json={"name": "B Tam", "email": "b1@x.vn", "phone": "0911000002"}).json()
    assert a["temporaryPassword"] != b["temporaryPassword"]
    tok, user = login("a1@x.vn", a["temporaryPassword"])
    assert user["mustChangePassword"] is True
    r = client.post("/api/auth/password/change", headers=auth(tok), json={"current_password": a["temporaryPassword"], "new_password": "Moi12345x"})
    assert r.status_code == 200 and r.json()["user"]["mustChangePassword"] is False
    assert client.post("/api/auth/login", json={"email": "a1@x.vn", "password": a["temporaryPassword"]}).status_code == 401
    login("a1@x.vn", "Moi12345x")


@case
def login_is_throttled_after_repeated_failures():
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "p1@x.vn", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "p1@x.vn", "password": "Abcdefg1"}).status_code == 429


@case
def otp_login_and_password_reset_use_the_demo_code():
    assert client.post("/api/auth/otp/send", json={"phone": "123"}).status_code == 422
    assert client.post("/api/auth/otp/send", json={"phone": "0912345678"}).json()["demo"] is True
    assert client.post("/api/auth/otp/login", json={"phone": "0912345678", "code": "000000"}).status_code == 400
    assert client.post("/api/auth/otp/login", json={"phone": "0912345678", "code": "123456"}).status_code == 200
    r = client.post("/api/auth/password/reset", json={"identifier": "0933444555", "code": "123456", "new_password": "weak"})
    assert r.status_code in (400, 422)


@case
def points_only_for_passing_words_and_replay_is_blocked_M2():
    tok, user = login(*PARENT)
    h = auth(tok)
    before = client.get("/api/profiles/child-an", headers=h).json()["stars"]
    fail = record_attempt({"score": 40, "elsa_rows": [], "errors": [], "canonical": ["b", "a", "_1"], "target_word": "Ba"}, user["id"])
    r = client.post("/api/record-practice", headers=h, json={"child_id": "child-an", "attempt_id": fail, "lesson_id": "lesson-0"})
    assert r.json()["stars_awarded"] == 0 and r.json()["updated_child"]["stars"] == before
    ok = record_attempt({"score": 90, "elsa_rows": [], "errors": [], "canonical": ["b", "a", "_1"], "target_word": "Ba"}, user["id"])
    r = client.post("/api/record-practice", headers=h, json={"child_id": "child-an", "attempt_id": ok, "lesson_id": "lesson-0"})
    assert r.json()["stars_awarded"] == 15 and r.json()["updated_child"]["stars"] == before + 15
    assert client.post("/api/record-practice", headers=h, json={"child_id": "child-an", "attempt_id": ok}).status_code == 409
    assert client.post("/api/record-practice", headers=h, json={"child_id": "child-an", "attempt_id": "att-forged"}).status_code == 404


@case
def attempt_of_another_account_cannot_be_recorded():
    ptok, puser = login(*PARENT)
    tok, _ = register(5)
    attempt = record_attempt({"score": 99, "elsa_rows": [], "errors": [], "canonical": ["b", "a", "_1"], "target_word": "Ba"}, puser["id"])
    cid = client.post("/api/profiles", headers=auth(tok), json={"name": "Bé Zô", "age": 5}).json()["id"]
    assert client.post("/api/record-practice", headers=auth(tok), json={"child_id": cid, "attempt_id": attempt}).status_code == 404


@case
def one_points_balance_for_header_wallet_and_leaderboard_M1():
    tok, _ = login(*PARENT)
    h = auth(tok)
    profile = client.get("/api/profiles/child-minh", headers=h).json()
    wallet = client.get("/api/profiles/child-minh/rewards", headers=h).json()
    assert wallet["balance"] == profile["stars"]
    me = next(e for e in wallet["leaderboard"] if e["isCurrent"])
    assert me["points"] == profile["stars"]


@case
def new_child_owns_nothing_and_redeeming_spends_the_same_balance_M17():
    tok, _ = register(6)
    h = auth(tok)
    cid = client.post("/api/profiles", headers=h, json={"name": "Bé Mới", "age": 5}).json()["id"]
    wallet = client.get(f"/api/profiles/{cid}/rewards", headers=h).json()
    assert wallet["owned"] == [] and wallet["balance"] == 0 and len(wallet["leaderboard"]) == 1
    assert client.post(f"/api/profiles/{cid}/redeem", headers=h, json={"reward_id": "rw-sao"}).status_code == 400
    ptok, _ = login(*PARENT)
    ph = auth(ptok)
    before = client.get("/api/profiles/child-minh/rewards", headers=ph).json()["balance"]
    r = client.post("/api/profiles/child-minh/redeem", headers=ph, json={"reward_id": "rw-sao"})
    assert r.status_code == 200 and r.json()["balance"] == before - 150 and "rw-sao" in r.json()["owned"]
    assert r.json()["profile"]["stars"] == before - 150
    assert client.post("/api/profiles/child-minh/redeem", headers=ph, json={"reward_id": "rw-sao"}).status_code == 409
    assert client.post("/api/profiles/child-minh/redeem", headers=ph, json={"reward_id": "rw-kiem"}).status_code == 404  # inactive


@case
def admin_lessons_are_the_lessons_children_see_M13_M16():
    atok, _ = login(*ADMIN)
    h = auth(atok)
    seeded = {l["id"] for l in client.get("/api/lessons").json()["lessons"]}
    assert "lesson-s-x" in seeded
    body = {"title": "Bài thử nghiệm", "category": "initial_consonants", "status": "draft",
            "words": [{"word": "Sao", "canonical": "S a w _1"}]}
    created = client.post("/api/admin/lessons", headers=h, json=body)
    assert created.status_code == 201, created.text
    lid = created.json()["id"]
    assert lid not in {l["id"] for l in client.get("/api/lessons").json()["lessons"]}  # draft is hidden
    assert client.put(f"/api/admin/lessons/{lid}", headers=h, json={**body, "status": "published"}).status_code == 200
    assert lid in {l["id"] for l in client.get("/api/lessons").json()["lessons"]}      # published = children see it
    bad = {**body, "words": [{"word": "Sao", "canonical": "S zz _1"}]}
    assert client.put(f"/api/admin/lessons/{lid}", headers=h, json=bad).status_code == 422
    assert client.put(f"/api/admin/lessons/{lid}", headers=h, json={**body, "status": "archived"}).status_code == 200
    assert lid not in {l["id"] for l in client.get("/api/lessons").json()["lessons"]}
    assert client.delete(f"/api/admin/lessons/{lid}", headers=h).status_code == 200
    assert client.get(f"/api/lessons/{lid}").status_code == 404


@case
def every_word_has_a_unique_id():
    for lesson in client.get("/api/lessons").json()["lessons"]:
        ids = [w["id"] for w in lesson["words"]]
        assert len(ids) == len(set(ids)) and all(ids), lesson["id"]


@case
def lesson_progress_is_derived_from_history_m3():
    tok, _ = login(*PARENT)
    minh = client.get("/api/profiles/child-minh", headers=auth(tok)).json()
    assert minh["completed_lessons"] == sum(1 for p in minh["progress"].values() if p["completed"]) >= 1
    assert all(p["total"] >= p["passed"] for p in minh["progress"].values())


@case
def admin_rewards_show_up_for_children_and_can_be_removed_M14_m1():
    atok, _ = login(*ADMIN)
    h = auth(atok)
    r = client.post("/api/admin/rewards", headers=h, json={"title": "Cúp Vàng", "kind": "Huy hiệu", "cost": 40})
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    ptok, _ = login(*PARENT)
    ids = {x["id"] for x in client.get("/api/profiles/child-minh/rewards", headers=auth(ptok)).json()["rewards"]}
    assert rid in ids
    assert client.post(f"/api/admin/rewards/{rid}/image", headers=h, files={"image": ("a.txt", b"x", "text/plain")}).status_code == 422
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 20
    assert client.post(f"/api/admin/rewards/{rid}/image", headers=h, files={"image": ("a.png", png, "image/png")}).json()["image"].startswith("/api/uploads/rewards/")
    assert client.post("/api/profiles/child-minh/redeem", headers=auth(ptok), json={"reward_id": rid}).status_code == 200
    assert client.delete(f"/api/admin/rewards/{rid}", headers=h).json()["status"] == "archived"  # owned: archived, not erased
    r2 = client.post("/api/admin/rewards", headers=h, json={"title": "Tạm", "kind": "Huy hiệu", "cost": 10}).json()["id"]
    assert client.delete(f"/api/admin/rewards/{r2}", headers=h).json()["status"] == "deleted"
    assert client.put(f"/api/admin/rewards/{r2}", headers=h, json={"cost": 0}).status_code in (404, 422)


@case
def prices_come_from_the_server_B7():
    plans = {p["id"]: p for p in client.get("/api/plans").json()}
    assert [plans[k]["monthly"] for k in ("free", "basic", "premium", "family")] == [0, 49000, 79000, 129000]
    assert plans["basic"]["yearly"] is None and plans["premium"]["yearly"] == 699000 and plans["family"]["yearly"] == 1083000
    assert client.post("/api/coupons/validate", json={"plan_id": "basic", "period": "yearly"}).status_code == 400
    r = client.post("/api/coupons/validate", json={"plan_id": "premium", "period": "yearly", "code": "phutrai20"}).json()
    assert r["base"] == 699000 and r["price"] == 559200
    assert client.post("/api/coupons/validate", json={"plan_id": "premium", "period": "monthly", "code": "PHUTRAI20"}).status_code == 400
    assert client.post("/api/coupons/validate", json={"plan_id": "premium", "period": "monthly", "code": "KIDGIANGSINH"}).status_code == 400


@case
def order_flow_upgrades_the_plan_only_for_its_owner():
    tok, user = register(7)
    h = auth(tok)
    order = client.post("/api/orders", headers=h, json={"plan_id": "premium", "period": "yearly", "coupon": "PHUTRAI20"}).json()
    assert order["amount"] == 559200 and order["status"] == "pending"
    other, _ = register(8)
    assert client.post(f"/api/orders/{order['id']}/confirm-demo", headers=auth(other)).status_code == 404
    assert client.post(f"/api/orders/{order['id']}/confirm-demo", headers=h).json()["status"] == "paid"
    assert client.get("/api/auth/me", headers=h).json()["user"]["plan"] == "premium"
    assert client.post(f"/api/orders/{order['id']}/confirm-demo", headers=h).status_code == 409


@case
def admin_actions_are_audited_with_the_real_actor():
    atok, _ = login(*ADMIN)
    audit = client.get("/api/admin/audit", headers=auth(atok)).json()
    assert audit and all(row["actor"] == "Quản trị viên Huy" for row in audit)


@case
def bootstrap_has_everything_the_console_needs():
    atok, _ = login(*ADMIN)
    data = client.get("/api/admin/bootstrap", headers=auth(atok)).json()
    for key in ("accounts", "orders", "plans", "coupons", "lessons", "rewards", "audit", "settings", "metrics", "phones"):
        assert key in data, key
    assert all("password" not in a and "password_hash" not in a for a in data["accounts"])
    assert any(a["kids"] for a in data["accounts"])


if __name__ == "__main__":
    failed = 0
    for fn in CASES:
        try:
            fn()
            print(f"ok    {fn.__name__}")
        except Exception as exc:  # noqa: BLE001 - report every failing case, not only the first
            failed += 1
            print(f"FAIL  {fn.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    if LIVE_URI:
        from backend.app.database import get_db

        get_db().client.drop_database(os.environ["MONGODB_DB"])
    sys.exit(1 if failed else 0)
