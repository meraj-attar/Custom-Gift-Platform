import hashlib
import hmac
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Order, Payment, Product
from app.services.payment_service import create_razorpay_order, verify_razorpay_signature


def register_user(client, email="paytester@example.com"):
    response = client.post("/api/auth/register", json={
        "name": "Pay Tester",
        "email": email,
        "password": "SecurePassword123!",
        "phone": "9876543210",
        "address": "Kothrud, Pune",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_sample_product(db, price=Decimal("799.00")):
    product = Product(
        title="Personalized Wooden Photo Frame",
        slug=f"photo-frame-{Decimal(price)}",
        category="Frames",
        price=price,
        description="Handcrafted frame with easel stand.",
        stock=10,
        customizable=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def create_sample_order(client, headers, product_id, quantity=1, delivery_option="standard"):
    res = client.post("/api/orders", headers=headers, json={
        "name": "Pay Tester",
        "phone": "9876543210",
        "email": "paytester@example.com",
        "address": "Flat 302, Riverview Apts",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "delivery_option": delivery_option,
        "payment_method": "razorpay",
        "items": [{"product_id": product_id, "quantity": quantity}],
    })
    assert res.status_code == 201, res.text
    return res.json()


def test_payment_config_endpoint(client):
    """Config endpoint exposes public Key ID only, never exposing Key Secret."""
    res = client.get("/api/payments/config")
    assert res.status_code == 200
    data = res.json()
    assert "key_id" in data
    assert "currency" in data
    assert data["currency"] == "INR"
    assert "razorpay_key_secret" not in data
    assert "key_secret" not in data
    assert "secret" not in data


def test_create_order_calculates_server_amount_and_creates_payment(client, db):
    """POST /api/payments/create-order creates razorpay order and records internal Payment."""
    headers = register_user(client, "createorder@example.com")
    product = create_sample_product(db, price=Decimal("799.00"))
    order_data = create_sample_order(client, headers, product.id, quantity=2, delivery_option="express")

    # Product subtotal: 799 * 2 = 1598. Express shipping: 99. Total: 1697.
    assert float(order_data["total_amount"]) == 1697.0

    res = client.post("/api/payments/create-order", headers=headers, json={"order_id": order_data["id"]})
    assert res.status_code == 200
    data = res.json()
    assert data["order_id"] == order_data["id"]
    assert data["amount"] == 169700  # 1697 INR in paise
    assert data["currency"] == "INR"
    assert data["razorpay_order_id"] is not None

    # Check internal Payment record was created
    payment = db.scalar(select(Payment).where(Payment.order_id == order_data["id"]))
    assert payment is not None
    assert payment.amount == Decimal("1697.00")
    assert payment.currency == "INR"
    assert payment.status in ["PENDING", "CREATED"]


def test_verify_payment_signature_success(client, db, monkeypatch):
    """Valid Razorpay signature confirms order, sets payment status to PAID, and updates internal Payment."""
    settings = get_settings()
    dummy_secret = "test_razorpay_secret_key_12345"
    monkeypatch.setattr(settings, "razorpay_key_secret", dummy_secret)
    monkeypatch.setattr(settings, "razorpay_key_id", "rzp_test_dummy123456")
    monkeypatch.setattr(settings, "payment_demo_mode", False)

    headers = register_user(client, "verifysuccess@example.com")
    product = create_sample_product(db, price=Decimal("499.00"))
    order_data = create_sample_order(client, headers, product.id, quantity=1)

    order_obj = db.get(Order, order_data["id"])
    order_obj.razorpay_order_id = "order_test123456"
    db.commit()

    # Generate genuine HMAC SHA256 signature
    dummy_payment_id = "pay_test987654321"
    message = f"order_test123456|{dummy_payment_id}".encode("utf-8")
    valid_sig = hmac.new(dummy_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    # Monkeypatch verify_razorpay_signature to test verification flow
    monkeypatch.setattr("app.api.payments.verify_razorpay_signature", lambda o, p, s: s == valid_sig)
    monkeypatch.setattr("app.api.payments.fetch_razorpay_payment", lambda pid: {"amount": 49900, "currency": "INR", "method": "upi"})

    res = client.post("/api/payments/verify", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_test123456",
        "razorpay_payment_id": dummy_payment_id,
        "razorpay_signature": valid_sig,
    })
    assert res.status_code == 200
    assert res.json()["message"] == "Payment verified successfully"

    db.refresh(order_obj)
    assert order_obj.payment_status == "PAID"
    assert order_obj.order_status == "CONFIRMED"
    assert order_obj.payment_id == dummy_payment_id

    payment = db.scalar(select(Payment).where(Payment.order_id == order_data["id"]))
    assert payment is not None
    assert payment.status == "SUCCESS"
    assert payment.razorpay_payment_id == dummy_payment_id
    assert payment.payment_method == "razorpay_upi"


def test_verify_payment_signature_invalid(client, db, monkeypatch):
    """Tampered or invalid signature is rejected with HTTP 400 and records payment failure."""
    settings = get_settings()
    monkeypatch.setattr(settings, "razorpay_key_secret", "dummy_secret_key_12345")
    monkeypatch.setattr(settings, "razorpay_key_id", "rzp_test_dummy123456")
    monkeypatch.setattr(settings, "payment_demo_mode", False)

    headers = register_user(client, "verifyfail@example.com")
    product = create_sample_product(db, price=Decimal("499.00"))
    order_data = create_sample_order(client, headers, product.id, quantity=1)

    order_obj = db.get(Order, order_data["id"])
    order_obj.razorpay_order_id = "order_test_tampered"
    db.commit()

    monkeypatch.setattr("app.api.payments.verify_razorpay_signature", lambda o, p, s: False)

    res = client.post("/api/payments/verify", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_test_tampered",
        "razorpay_payment_id": "pay_fake123456",
        "razorpay_signature": "invalid_forged_signature_hash",
    })
    assert res.status_code == 400
    assert "Invalid payment signature" in res.json()["detail"]

    db.refresh(order_obj)
    assert order_obj.payment_status != "PAID"


def test_duplicate_payment_verification_is_idempotent(client, db, monkeypatch):
    """Submitting the same verified payment ID again succeeds idempotently without duplicate charges."""
    settings = get_settings()
    dummy_secret = "secret_for_idempotency"
    monkeypatch.setattr(settings, "razorpay_key_secret", dummy_secret)
    monkeypatch.setattr(settings, "razorpay_key_id", "rzp_test_dummy")
    monkeypatch.setattr(settings, "payment_demo_mode", False)

    headers = register_user(client, "idempotent@example.com")
    product = create_sample_product(db, price=Decimal("299.00"))
    order_data = create_sample_order(client, headers, product.id)

    order_obj = db.get(Order, order_data["id"])
    order_obj.razorpay_order_id = "order_idem_1"
    db.commit()

    pay_id = "pay_idem_999"
    sig = hmac.new(dummy_secret.encode(), f"order_idem_1|{pay_id}".encode(), hashlib.sha256).hexdigest()

    monkeypatch.setattr("app.api.payments.verify_razorpay_signature", lambda o, p, s: True)
    monkeypatch.setattr("app.api.payments.fetch_razorpay_payment", lambda pid: {"amount": 29900, "currency": "INR", "method": "card"})

    # First verification
    r1 = client.post("/api/payments/verify", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_idem_1",
        "razorpay_payment_id": pay_id,
        "razorpay_signature": sig,
    })
    assert r1.status_code == 200

    # Second identical verification
    r2 = client.post("/api/payments/verify", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_idem_1",
        "razorpay_payment_id": pay_id,
        "razorpay_signature": sig,
    })
    assert r2.status_code == 200


def test_payment_id_reuse_across_orders_rejected(client, db, monkeypatch):
    """A payment ID already utilized on Order A cannot be reused to pay Order B."""
    settings = get_settings()
    dummy_secret = "secret_anti_replay"
    monkeypatch.setattr(settings, "razorpay_key_secret", dummy_secret)
    monkeypatch.setattr(settings, "razorpay_key_id", "rzp_test_dummy")
    monkeypatch.setattr(settings, "payment_demo_mode", False)

    headers = register_user(client, "antireuse@example.com")
    product = create_sample_product(db, price=Decimal("199.00"))

    order1 = create_sample_order(client, headers, product.id)
    order2 = create_sample_order(client, headers, product.id)

    # Order 1 gets paid
    db.add(Payment(
        user_id=1,
        order_id=order1["id"],
        razorpay_payment_id="pay_reused_unique_123",
        amount=Decimal("199.00"),
        status="SUCCESS",
    ))
    db.commit()

    order2_obj = db.get(Order, order2["id"])
    order2_obj.razorpay_order_id = "order_rzp_2"
    db.commit()

    monkeypatch.setattr("app.api.payments.verify_razorpay_signature", lambda o, p, s: True)

    # Attempt to verify Order 2 with Order 1's payment ID
    res = client.post("/api/payments/verify", headers=headers, json={
        "order_id": order2["id"],
        "razorpay_order_id": "order_rzp_2",
        "razorpay_payment_id": "pay_reused_unique_123",
        "razorpay_signature": "any_sig",
    })
    assert res.status_code == 409
    assert "already been utilized" in res.json()["detail"]


def test_payment_failure_and_cancellation_endpoints(client, db):
    """Cancelled and failed payments update payment records without marking order as paid."""
    headers = register_user(client, "failtest@example.com")
    product = create_sample_product(db, price=Decimal("349.00"))
    order_data = create_sample_order(client, headers, product.id)

    # 1. User cancels in modal
    res = client.post("/api/payments/fail", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_cancelled_1",
        "reason": "cancelled",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment was cancelled by user",
    })
    assert res.status_code == 200
    assert "CANCELLED" in res.json()["message"]

    order = db.get(Order, order_data["id"])
    assert order.payment_status == "CANCELLED"
    assert order.payment_status != "PAID"

    # 2. Bank declines payment
    res2 = client.post("/api/payments/fail", headers=headers, json={
        "order_id": order_data["id"],
        "razorpay_order_id": "order_cancelled_1",
        "reason": "failed",
        "error_code": "PAYMENT_DECLINED",
        "error_description": "Insufficient funds",
    })
    assert res2.status_code == 200
    assert "FAILED" in res2.json()["message"]

    db.refresh(order)
    assert order.payment_status == "FAILED"
    assert order.payment_status != "PAID"


def test_actual_razorpay_sdk_order_creation():
    """Test actual Razorpay Test Mode order creation via Razorpay Python SDK with real env credentials."""
    settings = get_settings()
    if not settings.razorpay_configured:
        pytest.skip("Razorpay credentials not present in environment")

    # Amount in paise: 100 paise = 1 INR
    result = create_razorpay_order(
        amount=100,
        receipt="TEST_INTEG_RECEIPT_1",
        internal_order_id=9999,
        notes={"test_mode": "true", "purpose": "automated_integration_test"},
    )
    assert "id" in result
    assert result["id"].startswith("order_")
    assert result["amount"] == 100
    assert result["currency"] == "INR"
    assert result["status"] == "created"
