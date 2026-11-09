from decimal import Decimal

from app.core.security import hash_password
from app.models import Product, User


def login_headers(client, email, password="Secure123"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def setup_users_and_product(client, db):
    admin = User(
        name="Admin",
        email="admin@example.com",
        password_hash=hash_password("Secure123"),
        role="admin",
    )
    product = Product(
        title="Ready Gift",
        slug="ready-gift",
        category="Gifts",
        price=Decimal("250.00"),
        description="A ready gift used to validate fulfillment transitions.",
        stock=5,
        customizable=False,
    )
    db.add_all([admin, product])
    db.commit()
    db.refresh(product)

    register = client.post("/api/auth/register", json={
        "name": "Buyer",
        "email": "buyer@example.com",
        "password": "Secure123",
    })
    assert register.status_code == 201
    customer_headers = {"Authorization": f"Bearer {register.json()['access_token']}"}
    admin_headers = login_headers(client, "admin@example.com")
    return product, customer_headers, admin_headers


def create_order(client, headers, product_id, payment_method):
    response = client.post("/api/orders", headers=headers, json={
        "name": "Buyer",
        "phone": "9999999999",
        "email": "buyer@example.com",
        "address": "Test address",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "payment_method": payment_method,
        "items": [{"product_id": product_id, "quantity": 1}],
    })
    assert response.status_code == 201
    return response.json()


def test_unpaid_online_order_cannot_enter_fulfillment_and_cancel_restores_stock(client, db):
    product, customer_headers, admin_headers = setup_users_and_product(client, db)
    order = create_order(client, customer_headers, product.id, "razorpay")

    blocked = client.patch(
        f"/api/orders/{order['id']}/status",
        headers=admin_headers,
        json={"order_status": "PROCESSING"},
    )
    assert blocked.status_code == 409

    cancelled = client.patch(
        f"/api/orders/{order['id']}/status",
        headers=admin_headers,
        json={"order_status": "CANCELLED"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["order_status"] == "CANCELLED"

    db.expire_all()
    assert db.get(Product, product.id).stock == 5


def test_delivered_cod_order_is_marked_paid(client, db):
    product, customer_headers, admin_headers = setup_users_and_product(client, db)
    order = create_order(client, customer_headers, product.id, "cod")

    delivered = client.patch(
        f"/api/orders/{order['id']}/status",
        headers=admin_headers,
        json={"order_status": "DELIVERED"},
    )
    assert delivered.status_code == 200
    data = delivered.json()
    assert data["order_status"] == "DELIVERED"
    assert data["payment_status"] == "PAID"
    assert data["payment_id"].startswith("COD-")
