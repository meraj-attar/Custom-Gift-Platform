from decimal import Decimal

from app.models import Product


def register_and_headers(client, email="buyer@example.com"):
    response = client.post("/api/auth/register", json={
        "name": "Buyer",
        "email": email,
        "password": "Secure123",
        "phone": "9999999999",
        "address": "Pune",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def add_product(db, **overrides):
    data = dict(
        title="Personalized Gift",
        slug="personalized-gift",
        category="Gifts",
        price=Decimal("499.00"),
        description="A personalized test gift for checkout validation.",
        stock=5,
        customizable=True,
        needs_text=True,
        max_text_length=50,
    )
    data.update(overrides)
    product = Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_checkout_validates_customization_and_server_total(client, db):
    headers = register_and_headers(client)
    product = add_product(db, needs_text=True, needs_image=True, needs_date=True, max_text_length=50)
    base = {
        "name": "Buyer",
        "phone": "9999999999",
        "email": "buyer@example.com",
        "address": "Test address",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "payment_method": "cod",
    }

    # Customization is optional since Studio was removed in favor of WhatsApp:
    # 1. Ordering without custom_text must now SUCCEED (201 Created)
    order_without_custom = client.post("/api/orders", headers=headers, json={**base, "items": [{"product_id": product.id, "quantity": 2}]})
    assert order_without_custom.status_code == 201
    assert float(order_without_custom.json()["total_amount"]) == 998.0
    assert order_without_custom.json()["user_id"] > 0

    # 2. Exceeding max_text_length must still be rejected (422)
    invalid_length = client.post("/api/orders", headers=headers, json={
        **base,
        "items": [{"product_id": product.id, "quantity": 1, "custom_text": "X" * 51}]
    })
    assert invalid_length.status_code == 422
    assert "exceeds 50 characters" in invalid_length.json()["detail"]

    # 3. Providing valid custom_text also succeeds
    valid = client.post("/api/orders", headers=headers, json={**base, "items": [{"product_id": product.id, "quantity": 2, "custom_text": "Happy Birthday"}]})
    assert valid.status_code == 201


def test_demo_razorpay_flow(client, db):
    headers = register_and_headers(client, "pay@example.com")
    product = add_product(db, slug="payment-gift", needs_text=False)
    order = client.post("/api/orders", headers=headers, json={
        "name": "Buyer", "phone": "9999999999", "email": "pay@example.com", "address": "Address",
        "city": "Pune", "state": "Maharashtra", "pincode": "411001", "payment_method": "razorpay",
        "items": [{"product_id": product.id, "quantity": 1}],
    }).json()

    payment = client.post("/api/payments/create", headers=headers, json={"order_id": order["id"]})
    assert payment.status_code == 200
    assert payment.json()["mode"] == "demo"

    completed = client.post("/api/payments/demo-complete", headers=headers, json={"order_id": order["id"]})
    assert completed.status_code == 200

    detail = client.get(f"/api/orders/{order['id']}", headers=headers).json()
    assert detail["payment_status"] == "PAID"
    assert detail["order_status"] == "CONFIRMED"


def test_customization_preview_security(client, db):
    headers1 = register_and_headers(client, "user1@example.com")
    headers2 = register_and_headers(client, "user2@example.com")

    # User 2 attempts to preview user 1's customization image (IDOR protection)
    forbidden = client.get(
        "/api/orders/customization-preview?ref=local:customizations/1/secret_photo.jpg",
        headers=headers2,
    )
    assert forbidden.status_code == 403
    assert "Customization image does not belong to the current user" in forbidden.json()["detail"]

    # Nonexistent file for the current user returns 404
    me = client.get("/api/auth/me", headers=headers1).json()
    not_found = client.get(
        f"/api/orders/customization-preview?ref=local:customizations/{me['id']}/nonexistent.jpg",
        headers=headers1,
    )
    assert not_found.status_code == 404


def test_checkout_stock_validation(client, db):
    headers = register_and_headers(client, "stockbuyer@example.com")
    product = add_product(db, slug="limited-stock-gift", stock=2, needs_text=False)
    base = {
        "name": "Buyer",
        "phone": "9999999999",
        "email": "stockbuyer@example.com",
        "address": "Pune MG Road",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "payment_method": "cod",
    }

    # Attempt to order more than available stock
    res = client.post("/api/orders", headers=headers, json={**base, "items": [{"product_id": product.id, "quantity": 5}]})
    assert res.status_code == 409
    assert "Only 2 units of" in res.json()["detail"]

