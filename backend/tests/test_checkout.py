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
    product = add_product(db)
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

    invalid = client.post("/api/orders", headers=headers, json={**base, "items": [{"product_id": product.id, "quantity": 2}]})
    assert invalid.status_code == 422

    valid = client.post("/api/orders", headers=headers, json={**base, "items": [{"product_id": product.id, "quantity": 2, "custom_text": "Happy Birthday"}]})
    assert valid.status_code == 201
    assert float(valid.json()["total_amount"]) == 998.0
    assert valid.json()["user_id"] > 0


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
