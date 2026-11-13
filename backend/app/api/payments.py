import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Order, Payment, User
from app.schemas.common import MessageResponse
from app.schemas.payment import (
    DemoPaymentRequest,
    PaymentConfigResponse,
    PaymentFailureRequest,
    PaymentOrderRequest,
    PaymentOrderResponse,
    PaymentVerifyRequest,
)
from app.services.payment_service import (
    create_razorpay_order,
    fetch_razorpay_payment,
    verify_razorpay_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


def owned_order(db: Session, order_id: int, user: User) -> Order:
    order = db.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/config", response_model=PaymentConfigResponse)
def get_payment_config():
    """Returns public Razorpay configuration (Key ID only) to the frontend.
    Never exposes the Key Secret.
    """
    return PaymentConfigResponse(
        key_id=settings.razorpay_key_id,
        currency="INR",
        enabled=settings.razorpay_configured,
    )


@router.post("/create", response_model=PaymentOrderResponse)
@router.post("/create-order", response_model=PaymentOrderResponse)
def create_payment(payload: PaymentOrderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = owned_order(db, payload.order_id, current_user)
    if order.payment_method != "razorpay":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This order does not use Razorpay")
    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled orders cannot be paid")
    if order.payment_status == "PAID":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is already paid")

    # Never trust amount from frontend: convert order.total_amount from database to paise (1 INR = 100 paise)
    amount_in_paise = int(order.total_amount * 100)

    # Fallback to demo mode only if real Razorpay is NOT configured or demo mode is explicitly enabled
    if settings.payment_demo_mode or not settings.razorpay_configured:
        razorpay_order_id = f"demo_order_{secrets.token_hex(8)}"
        order.razorpay_order_id = razorpay_order_id

        # Record or update internal Payment entry in PENDING state
        payment_rec = db.scalar(
            select(Payment).where(Payment.order_id == order.id, Payment.status == "PENDING")
        )
        if not payment_rec:
            payment_rec = Payment(
                user_id=current_user.id,
                order_id=order.id,
                razorpay_order_id=razorpay_order_id,
                amount=order.total_amount,
                currency="INR",
                status="PENDING",
                payment_method="demo",
            )
            db.add(payment_rec)
        else:
            payment_rec.razorpay_order_id = razorpay_order_id

        db.commit()
        return PaymentOrderResponse(
            mode="demo",
            order_id=order.id,
            order_number=order.order_number,
            razorpay_order_id=razorpay_order_id,
            amount=amount_in_paise,
            currency="INR",
            key_id=None,
            business_name="CustomGift",
            customer_name=order.name,
            customer_email=order.email,
            customer_phone=order.phone,
        )

    try:
        notes = {
            "order_number": order.order_number,
            "user_id": str(current_user.id),
            "email": order.email,
        }
        created = create_razorpay_order(
            amount=amount_in_paise,
            receipt=order.order_number,
            internal_order_id=order.id,
            notes=notes,
        )
    except Exception as exc:
        logger.exception("Failed to create Razorpay order for internal order %s: %s", order.id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Razorpay order creation failed. Please check network connection.") from exc

    rz_order_id = created["id"]
    order.razorpay_order_id = rz_order_id

    # Record or update internal Payment entry in PENDING state
    payment_rec = db.scalar(
        select(Payment).where(Payment.order_id == order.id, Payment.status == "PENDING")
    )
    if not payment_rec:
        payment_rec = Payment(
            user_id=current_user.id,
            order_id=order.id,
            razorpay_order_id=rz_order_id,
            amount=order.total_amount,
            currency="INR",
            status="PENDING",
            payment_method="razorpay",
        )
        db.add(payment_rec)
    else:
        payment_rec.razorpay_order_id = rz_order_id

    db.commit()

    return PaymentOrderResponse(
        mode="razorpay",
        order_id=order.id,
        order_number=order.order_number,
        razorpay_order_id=rz_order_id,
        amount=amount_in_paise,
        currency="INR",
        key_id=settings.razorpay_key_id,
        business_name="CustomGift",
        customer_name=order.name,
        customer_email=order.email,
        customer_phone=order.phone,
    )


@router.post("/verify", response_model=MessageResponse)
def verify_payment(payload: PaymentVerifyRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = owned_order(db, payload.order_id, current_user)
    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled orders cannot be paid")

    # Idempotent: If order is already PAID, return success
    if order.payment_status == "PAID" and order.payment_id == payload.razorpay_payment_id:
        return MessageResponse(message="Payment already verified successfully")

    if not order.razorpay_order_id or order.razorpay_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order mismatch")

    if not settings.razorpay_configured or settings.payment_demo_mode:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Real Razorpay verification is not enabled")

    # Prevent payment ID reuse across different orders
    reused = db.scalar(
        select(Payment).where(
            Payment.razorpay_payment_id == payload.razorpay_payment_id,
            Payment.order_id != order.id,
            Payment.status == "SUCCESS",
        )
    )
    if reused:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment ID has already been utilized for another order",
        )

    # Server-side Razorpay signature verification
    valid_sig = verify_razorpay_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    )
    if not valid_sig:
        # Mark payment as failed due to signature error
        payment_rec = db.scalar(
            select(Payment).where(Payment.order_id == order.id, Payment.razorpay_order_id == payload.razorpay_order_id)
        )
        if payment_rec:
            payment_rec.status = "FAILED"
            payment_rec.error_code = "BAD_SIGNATURE"
            payment_rec.error_description = "Server-side Razorpay signature verification failed"
            db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature")

    # Fetch live payment details from Razorpay to verify amount and payment method
    rz_payment = fetch_razorpay_payment(payload.razorpay_payment_id)
    payment_method_name = "razorpay"
    if rz_payment:
        # Verify amount if available
        captured_amount = rz_payment.get("amount")
        expected_amount = int(order.total_amount * 100)
        if captured_amount is not None and captured_amount != expected_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount mismatch: expected {expected_amount} paise, received {captured_amount} paise",
            )
        if rz_payment.get("method"):
            payment_method_name = f"razorpay_{rz_payment['method']}"

    # Update or create the Payment record with SUCCESS status
    payment_rec = db.scalar(
        select(Payment).where(Payment.order_id == order.id, Payment.razorpay_order_id == payload.razorpay_order_id)
    )
    if not payment_rec:
        payment_rec = Payment(
            user_id=current_user.id,
            order_id=order.id,
            razorpay_order_id=payload.razorpay_order_id,
            amount=order.total_amount,
            currency="INR",
            status="SUCCESS",
            payment_method=payment_method_name,
        )
        db.add(payment_rec)
    else:
        payment_rec.status = "SUCCESS"
        payment_rec.payment_method = payment_method_name

    payment_rec.razorpay_payment_id = payload.razorpay_payment_id
    payment_rec.razorpay_signature = payload.razorpay_signature

    order.payment_id = payload.razorpay_payment_id
    order.payment_status = "PAID"
    order.order_status = "CONFIRMED"
    db.commit()

    return MessageResponse(message="Payment verified successfully")


@router.post("/fail", response_model=MessageResponse)
def record_payment_failure(payload: PaymentFailureRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = owned_order(db, payload.order_id, current_user)
    if order.payment_status == "PAID":
        return MessageResponse(message="Order is already marked as paid")

    new_status = "CANCELLED" if payload.reason == "cancelled" else "FAILED"
    payment_rec = db.scalar(
        select(Payment).where(Payment.order_id == order.id).order_by(Payment.id.desc())
    )
    if not payment_rec:
        payment_rec = Payment(
            user_id=current_user.id,
            order_id=order.id,
            razorpay_order_id=payload.razorpay_order_id,
            amount=order.total_amount,
            currency="INR",
            status=new_status,
            error_code=payload.error_code,
            error_description=payload.error_description,
            payment_method="razorpay",
        )
        db.add(payment_rec)
    else:
        payment_rec.status = new_status
        payment_rec.error_code = payload.error_code
        payment_rec.error_description = payload.error_description
        if payload.razorpay_order_id:
            payment_rec.razorpay_order_id = payload.razorpay_order_id

    order.payment_status = new_status
    db.commit()
    return MessageResponse(message=f"Payment recorded as {new_status}")


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
