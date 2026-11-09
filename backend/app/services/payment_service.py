import hashlib
import hmac

import httpx

from app.core.config import settings


RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"


def create_razorpay_order(amount: int, receipt: str, internal_order_id: int) -> dict:
    if not settings.razorpay_configured:
        raise RuntimeError("Razorpay credentials are not configured")
    response = httpx.post(
        RAZORPAY_ORDERS_URL,
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
        json={
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "notes": {"internal_order_id": str(internal_order_id)},
        },
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not settings.razorpay_key_secret:
        return False
    message = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(settings.razorpay_key_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
