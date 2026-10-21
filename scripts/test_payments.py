"""MoMo payments without a network: signatures, the IPN rules, and the demo confirmation lock in production.

Run from the repo root:  backend/venv/bin/python scripts/test_payments.py
"""
import json
import os
import sys
import uuid
from pathlib import Path

os.environ["MONGODB_URI"] = "mongomock://"
os.environ["MONGODB_DB"] = f"vp_test_{uuid.uuid4().hex[:8]}"
os.environ["VIETPHONICS_ENV"] = "development"
os.environ["EMAIL_PROVIDER"] = "memory"
os.environ.update({"MOMO_PARTNER_CODE": "TESTPARTNER", "MOMO_ACCESS_KEY": "ak", "MOMO_SECRET_KEY": "sk", "PUBLIC_API_URL": "https://api.example.com"})
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app import config, payments  # noqa: E402
from backend.app.database import col, init_db  # noqa: E402
from backend.app.main import app  # noqa: E402

init_db()
client = TestClient(app)
CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def login():
    r = client.post("/api/auth/login", json={"email": "phuhuynh@vietphonics.vn", "password": "123456"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


class FakeReply:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode()


def new_order(headers, method="MoMo"):
    return client.post("/api/orders", headers=headers, json={"plan_id": "premium", "period": "monthly", "method": method}).json()


def start(headers, order, reply):
    seen = {}
    original = payments.urllib.request.urlopen
    payments.urllib.request.urlopen = lambda request, timeout=0: (seen.update(body=json.loads(request.data), url=request.full_url), FakeReply(reply))[1]
    try:
        r = client.post(f"/api/orders/{order['id']}/pay", headers=headers)
    finally:
        payments.urllib.request.urlopen = original
    return r, seen


def ipn(order_id, amount, result=0, **override):
    data = {"partnerCode": "TESTPARTNER", "orderId": order_id, "requestId": order_id + "-req", "amount": amount, "orderInfo": "x",
            "orderType": "momo_wallet", "transId": 4001, "resultCode": result, "message": "ok", "payType": "qr", "responseTime": 1700000000000, "extraData": ""}
    data.update(override)
    values = {k: ("" if v is None else str(v)) for k, v in data.items()}
    values["accessKey"] = "ak"
    data["signature"] = payments._sign(payments._IPN_FIELDS, values)
    return data


@case
def momo_order_is_labelled_real_and_start_stores_the_payment():
    h = login()
    order = new_order(h)
    assert order["method"] == "MoMo", order
    r, seen = start(h, order, {"resultCode": 0, "payUrl": "https://pay.example/x", "qrCodeUrl": "momo://pay?x=1", "deeplink": "momo://app"})
    assert r.status_code == 200 and r.json()["qrCode"] == "momo://pay?x=1", r.text
    body = seen["body"]
    assert body["partnerCode"] == "TESTPARTNER" and body["amount"] == str(order["amount"]) and body["requestType"] == "captureWallet"
    assert "accessKey" not in body and "secret" not in json.dumps(body).lower()
    assert body["ipnUrl"] == "https://api.example.com/api/payments/momo/ipn" and seen["url"].endswith("/v2/gateway/api/create")
    assert col("orders").find_one({"_id": order["id"]})["momo_order_id"] == body["orderId"]


@case
def a_signed_ipn_marks_the_order_paid_once_and_upgrades_the_plan():
    h = login()
    order = new_order(h)
    start(h, order, {"resultCode": 0, "qrCodeUrl": "momo://pay"})
    momo_id = col("orders").find_one({"_id": order["id"]})["momo_order_id"]
    assert client.post("/api/payments/momo/ipn", json=ipn(momo_id, order["amount"])).status_code == 204
    paid = client.get(f"/api/orders/{order['id']}", headers=h).json()
    assert paid["status"] == "paid" and paid["momo_trans_id"] == "4001"
    assert client.post("/api/payments/momo/ipn", json=ipn(momo_id, order["amount"])).status_code == 204  # repeat: no change
    assert col("orders").count_documents({"_id": order["id"], "status": "paid"}) == 1


@case
def forged_wrong_amount_and_unknown_notifications_change_nothing():
    h = login()
    order = new_order(h)
    start(h, order, {"resultCode": 0, "qrCodeUrl": "momo://pay"})
    momo_id = col("orders").find_one({"_id": order["id"]})["momo_order_id"]
    bad = ipn(momo_id, order["amount"]); bad["signature"] = "0" * 64
    assert client.post("/api/payments/momo/ipn", json=bad).status_code == 400
    assert client.post("/api/payments/momo/ipn", json=ipn(momo_id, 1)).status_code == 400  # signed, but the amount is not ours
    assert client.post("/api/payments/momo/ipn", json=ipn("VP-0-1", order["amount"])).status_code == 400
    assert client.post("/api/payments/momo/ipn", json=ipn(momo_id, order["amount"], partnerCode="OTHER")).status_code == 400
    assert client.post("/api/payments/momo/ipn", content=b"not json").status_code == 400
    assert col("orders").find_one({"_id": order["id"]})["status"] == "pending"


@case
def a_failed_payment_marks_the_order_failed():
    h = login()
    order = new_order(h)
    start(h, order, {"resultCode": 0, "qrCodeUrl": "momo://pay"})
    momo_id = col("orders").find_one({"_id": order["id"]})["momo_order_id"]
    assert client.post("/api/payments/momo/ipn", json=ipn(momo_id, order["amount"], result=1006)).status_code == 204
    assert col("orders").find_one({"_id": order["id"]})["status"] == "failed"


@case
def starting_needs_the_owner_a_momo_order_and_a_good_reply():
    h = login()
    order = new_order(h)
    r, _ = start(h, order, {"resultCode": 99, "message": "no"})
    assert r.status_code == 502 and "MoMo" in r.json()["detail"]
    simulated = new_order(h, method="VNPay")
    assert simulated["method"].endswith("(mô phỏng)")
    assert client.post(f"/api/orders/{simulated['id']}/pay", headers=h).status_code == 400
    assert client.post(f"/api/orders/{order['id']}/pay").status_code == 401


@case
def the_demo_confirmation_is_closed_in_production():
    h = login()
    order = new_order(h, method="VNPay")
    config.PRODUCTION = True
    try:
        assert client.post(f"/api/orders/{order['id']}/confirm-demo", headers=h).status_code == 404
    finally:
        config.PRODUCTION = False
    assert client.post(f"/api/orders/{order['id']}/confirm-demo", headers=h).status_code == 200


@case
def payment_config_reports_what_is_available():
    assert client.get("/api/payments/config").json() == {"momo": True, "demo": True}


if __name__ == "__main__":
    failed = 0
    for fn in CASES:
        try:
            fn()
            print("ok   ", fn.__name__)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print("FAIL ", fn.__name__, f"{type(exc).__name__}: {exc}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    sys.exit(1 if failed else 0)
