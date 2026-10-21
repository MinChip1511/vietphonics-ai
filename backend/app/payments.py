"""MoMo payments: create a payment (QR + app link) for an order and confirm it from MoMo's IPN callback.

The customer never confirms anything: only a request signed with our secret key (HMAC-SHA256) can mark an
order paid, and only when partner, order, amount and result all match what we stored.
"""
import hashlib
import hmac
import json
import logging
import time
import urllib.error
import urllib.request

from . import commerce, config
from .database import col

log = logging.getLogger("vietphonics.payments")

# Field order MoMo signs (alphabetical, as in MoMo's v2 gateway documentation).
_CREATE_FIELDS = ("accessKey", "amount", "extraData", "ipnUrl", "orderId", "orderInfo", "partnerCode", "redirectUrl", "requestId", "requestType")
_IPN_FIELDS = ("accessKey", "amount", "extraData", "message", "orderId", "orderInfo", "orderType", "partnerCode", "payType", "requestId", "responseTime", "resultCode", "transId")


class PaymentError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


def _sign(fields, values):
    raw = "&".join(f"{name}={values.get(name, '')}" for name in fields)
    return hmac.new(config.MOMO_SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()


def start_momo_payment(order):
    """Ask MoMo for a payment for this pending order and remember what it returned."""
    if not commerce.momo_enabled():
        raise PaymentError("Thanh toán MoMo chưa được cấu hình.", 503)
    if order["method"] != "MoMo":
        raise PaymentError("Đơn hàng này không thanh toán bằng MoMo.", 400)
    if order["status"] != "pending":
        raise PaymentError("Đơn hàng này không còn ở trạng thái chờ thanh toán.", 409)
    stamp = int(time.time())
    momo_order_id = f"{order['id']}-{stamp}"  # MoMo wants a fresh orderId for every attempt
    values = {
        "accessKey": config.MOMO_ACCESS_KEY, "amount": str(int(order["amount"])), "extraData": "",
        "ipnUrl": f"{config.PUBLIC_API_URL}/api/payments/momo/ipn", "orderId": momo_order_id,
        "orderInfo": f"VietPhonics {order['id']}", "partnerCode": config.MOMO_PARTNER_CODE,
        "redirectUrl": f"{config.PUBLIC_WEB_URL or config.PUBLIC_API_URL}/", "requestId": f"{momo_order_id}-req",
        "requestType": "captureWallet",
    }
    body = {**{k: v for k, v in values.items() if k != "accessKey"}, "lang": "vi", "signature": _sign(_CREATE_FIELDS, values)}
    request = urllib.request.Request(
        f"{config.MOMO_ENDPOINT}/v2/gateway/api/create", data=json.dumps(body).encode(),
        headers={"content-type": "application/json; charset=UTF-8"}, method="POST",
    )
    try:
        reply = json.loads(urllib.request.urlopen(request, timeout=20).read())
    except (urllib.error.URLError, OSError, ValueError) as exc:
        log.warning("MoMo create failed: %s", exc)
        raise PaymentError("Không kết nối được MoMo, vui lòng thử lại sau.") from exc
    if reply.get("resultCode") != 0 or not (reply.get("qrCodeUrl") or reply.get("payUrl")):
        log.warning("MoMo refused the payment: %s", {k: reply.get(k) for k in ("resultCode", "message")})
        raise PaymentError("MoMo chưa tạo được giao dịch, vui lòng thử lại.")
    pay = {"momo_order_id": momo_order_id, "pay_url": reply.get("payUrl", ""), "qr_code": reply.get("qrCodeUrl", ""), "deeplink": reply.get("deeplink", "")}
    col("orders").update_one({"_id": order["id"], "status": "pending"}, {"$set": pay})
    return {"order_id": order["id"], "payUrl": pay["pay_url"], "qrCode": pay["qr_code"], "deeplink": pay["deeplink"]}


def handle_momo_ipn(data):
    """Process MoMo's server-to-server notification. Raises PaymentError(400) when it is not genuine."""
    if not commerce.momo_enabled() or not isinstance(data, dict):
        raise PaymentError("invalid", 400)
    values = {**{k: ("" if data.get(k) is None else str(data.get(k))) for k in _IPN_FIELDS}, "accessKey": config.MOMO_ACCESS_KEY}
    expected = _sign(_IPN_FIELDS, values)
    if not hmac.compare_digest(expected, str(data.get("signature", ""))) or values["partnerCode"] != config.MOMO_PARTNER_CODE:
        log.warning("MoMo IPN with a bad signature for %s", data.get("orderId"))
        raise PaymentError("invalid signature", 400)
    order = col("orders").find_one({"momo_order_id": values["orderId"]})
    if not order:
        raise PaymentError("unknown order", 400)
    if values["amount"] != str(int(order["amount"])):
        log.warning("MoMo IPN amount %s does not match order %s (%s)", values["amount"], order["_id"], order["amount"])
        raise PaymentError("amount mismatch", 400)
    if values["resultCode"] == "0":
        commerce.mark_paid(order["_id"], {"momo_trans_id": values["transId"]})
    else:
        col("orders").update_one({"_id": order["_id"], "status": "pending"}, {"$set": {"status": "failed"}})
