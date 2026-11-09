from decimal import Decimal

from app.core.security import hash_password
from app.models import Order, Product, User


def auth(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "Secure123"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_user_cannot_read_another_users_order(client, db):
    user1 = User(name="User One", email="one@example.com", password_hash=hash_password("Secure123"), role="customer")
    user2 = User(name="User Two", email="two@example.com", password_hash=hash_password("Secure123"), role="customer")
    product = Product(title="Gift", slug="gift", category="Test", price=Decimal("100.00"), description="A test gift product", stock=10)
    db.add_all([user1, user2, product])
    db.commit()
    order = Order(order_number="CG-TEST-1", user_id=user1.id, name="User One", phone="9999999999", email=user1.email, address="Address", city="Pune", state="MH", pincode="411001", total_amount=Decimal("100.00"), payment_method="cod", payment_status="PENDING", order_status="CONFIRMED")
    db.add(order)
    db.commit()

    response = client.get(f"/api/orders/{order.id}", headers=auth(client, user2.email))
    assert response.status_code == 404
