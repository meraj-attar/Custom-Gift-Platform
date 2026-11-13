import hashlib
import hmac
import logging
from typing import Any

import razorpay

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_razorpay_client() -> razorpay.Client:
    if not settings.razorpay_configured:
        raise RuntimeError("Razorpay credentials are not configured in environment")
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_razorpay_order(amount: int, receipt: str, internal_order_id: int, notes: dict[str, Any] | None = None) -> dict:
    """Create a new Razorpay order in Test Mode using the official Razorpay SDK.
    amount is in paise (1 INR = 100 paise).
    """
    client = get_razorpay_client()
    merged_notes = {"internal_order_id": str(internal_order_id)}
    if notes:
        merged_notes.update(notes)

    order_payload = {
        "amount": amount,
        "currency": "INR",
        "receipt": receipt,
        "notes": merged_notes,
    }
    logger.info("Creating Razorpay order for receipt=%s, internal_order_id=%s, amount=%s", receipt, internal_order_id, amount)
    return client.order.create(data=order_payload)


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature using the official SDK and constant-time HMAC SHA256 comparison."""
    if not settings.razorpay_key_secret or not order_id or not payment_id or not signature:
        return False

    # 1. Primary verification via official Razorpay SDK utility
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        sdk_verified = True
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Razorpay SDK signature verification failed for order=%s, payment=%s", order_id, payment_id)
        return False
    except Exception as exc:
        logger.error("Unexpected error during Razorpay SDK signature check: %s", exc)
        sdk_verified = False

    # 2. Secondary HMAC-SHA256 constant-time check
    message = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(settings.razorpay_key_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    hmac_verified = hmac.compare_digest(expected, signature)

    return sdk_verified and hmac_verified


def fetch_razorpay_payment(payment_id: str) -> dict | None:
    """Fetch live payment details from Razorpay to verify payment status and method."""
    try:
        client = get_razorpay_client()
        return client.payment.fetch(payment_id)
    except Exception as exc:
        logger.warning("Could not fetch Razorpay payment %s: %s", payment_id, exc)
        return None
