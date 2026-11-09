import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Order, User
from app.schemas.common import MessageResponse
from app.schemas.payment import DemoPaymentRequest, PaymentOrderRequest, PaymentOrderResponse, PaymentVerifyRequest
from app.services.payment_service import create_razorpay_order, verify_razorpay_signature


router = APIRouter(prefix="/payments", tags=["Payments"])


def owned_order(db: Session, order_id: int, user: User) -> Order:
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("/create", response_model=PaymentOrderResponse)
def create_payment(payload: PaymentOrderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = owned_order(db, payload.order_id, current_user)
    if order.payment_method != "razorpay":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This order does not use Razorpay")
    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled orders cannot be paid")
    if order.payment_status == "PAID":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is already paid")

    amount = int(order.total_amount * 100)
    if settings.payment_demo_mode or not settings.razorpay_configured:
        razorpay_order_id = f"demo_order_{secrets.token_hex(8)}"
        order.razorpay_order_id = razorpay_order_id
        db.commit()
        return PaymentOrderResponse(mode="demo", order_id=order.id, razorpay_order_id=razorpay_order_id, amount=amount)

    try:
        created = create_razorpay_order(amount, order.order_number, order.id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Razorpay order creation failed") from exc
    order.razorpay_order_id = created["id"]
    db.commit()
    return PaymentOrderResponse(mode="razorpay", order_id=order.id, razorpay_order_id=created["id"], amount=amount, key_id=settings.razorpay_key_id)


@router.post("/verify", response_model=MessageResponse)
def verify_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = owned_order(db, payload.order_id, current_user)
    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled orders cannot be paid")
    if not order.razorpay_order_id or order.razorpay_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order mismatch")
    if not settings.razorpay_configured or settings.payment_demo_mode:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Real Razorpay verification is not enabled")

    if not verify_razorpay_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature")

    order.payment_id = payload.razorpay_payment_id
    order.payment_status = "PAID"
    order.order_status = "CONFIRMED"
    db.commit()
    return MessageResponse(message="Payment verified successfully")


@router.post("/demo-complete", response_model=MessageResponse)
def demo_complete(payload: DemoPaymentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not settings.payment_demo_mode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo payment mode is disabled")
    order = owned_order(db, payload.order_id, current_user)
    if order.payment_method != "razorpay" or not (order.razorpay_order_id or "").startswith("demo_order_"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No demo payment is pending")
    order.payment_id = f"demo_pay_{secrets.token_hex(8)}"
    order.payment_status = "PAID"
    order.order_status = "CONFIRMED"
    db.commit()
    return MessageResponse(message="Demo payment completed")
