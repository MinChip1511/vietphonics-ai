"""Public content (lessons, plans, coupons) and the parent's own orders."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from .. import catalog, commerce
from ..security import current_account

router = APIRouter(prefix="/api", tags=["content"])


class CouponCheckBody(BaseModel):
    plan_id: str
    period: str = "monthly"
    code: Optional[str] = None


class OrderBody(BaseModel):
    plan_id: str
    period: str = "monthly"
    coupon: Optional[str] = None
    method: str = "QR ngân hàng"


@router.get("/lessons")
def lessons(category: Optional[str] = None):
    return {"categories": catalog.categories(), "lessons": catalog.list_lessons(published_only=True, category=category)}


@router.get("/lessons/{lesson_id}")
def lesson(lesson_id: str):
    found = catalog.get_lesson(lesson_id, published_only=True)
    if not found:
        raise HTTPException(status_code=404, detail="Bài học không tồn tại")
    return found


@router.get("/plans")
def plans():
    return commerce.list_plans(active_only=True)


@router.post("/coupons/validate")
def validate_coupon(body: CouponCheckBody):
    plan, base, final, coupon = commerce.price_for(body.plan_id, body.period, body.code)
    return {"plan": plan["id"], "base": base, "price": final, "coupon": coupon}


@router.get("/orders")
def my_orders(account: dict = Depends(current_account)):
    return commerce.list_orders(account["id"])


@router.post("/orders", status_code=201)
def create_order(body: OrderBody, account: dict = Depends(current_account)):
    return commerce.create_order(account, body.plan_id, body.period, body.coupon, body.method)


@router.post("/orders/{order_id}/confirm-demo")
def confirm_demo(order_id: str, account: dict = Depends(current_account)):
    return commerce.confirm_demo_payment(order_id, account)


@router.get("/uploads/{file_id:path}")
def uploaded_file(file_id: str):
    """Reward pictures are stored in the database; file ids are unique per upload, so they cache forever."""
    found = catalog.get_file(file_id)
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp")
    content_type, data = found
    return Response(data, media_type=content_type, headers={"Cache-Control": "public, max-age=31536000, immutable"})
