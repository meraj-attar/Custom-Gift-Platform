from decimal import Decimal
import pytest
from app.core.security import create_access_token, hash_password
from app.models import Order, OrderItem, Payment, Product, StoreSetting, User


def create_admin(db):
    admin = User(
        name="Admin User",
        email="admin.test@customgift.dev",
        password_hash=hash_password("AdminPass123"),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def create_customer(db, email="customer.test@customgift.dev"):
    user = User(
        name="Test Customer",
        email=email,
        password_hash=hash_password("CustomerPass123"),
        role="customer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def admin_headers(admin_user):
    token = create_access_token(admin_user.id, admin_user.role)
    return {"Authorization": f"Bearer {token}"}


def test_customer_cannot_create_product(client, db):
    customer = create_customer(db)
    token = create_access_token(customer.id, customer.role)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/products",
        headers=headers,
        json={
            "title": "Admin only",
            "category": "Test",
            "price": 100,
            "description": "A sufficiently long description",
            "stock": 1,
        },
    )
    assert response.status_code == 403


def test_admin_analytics_endpoint(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)

    # Create customer and product
    customer = create_customer(db)
    product = Product(
        title="Personalized Wooden Lamp",
        slug="personalized-wooden-lamp",
        category="Decor",
        price=Decimal("899.00"),
        stock=3,  # Low stock (<5)
        description="Warm LED lamp customized with your picture.",
        is_active=True,
    )
    db.add(product)
    db.commit()

    # Call analytics
    res = client.get("/api/admin/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "revenue" in data
    assert "orders_count" in data
    assert "payments_by_status" in data
    assert "low_stock_count" in data
    assert data["low_stock_count"] >= 1
    assert "categories_summary" in data


def test_admin_payments_endpoint(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)
    customer = create_customer(db)

    order = Order(
        order_number="CG-20261112-TEST01",
        user_id=customer.id,
        total_amount=Decimal("1299.00"),
        order_status="CONFIRMED",
        payment_status="PAID",
        payment_method="razorpay",
        name="Test Customer",
        phone="9876543210",
        email=customer.email,
        address="123 MG Road",
        city="Pune",
        state="Maharashtra",
        pincode="411001",
    )
    db.add(order)
    db.commit()

    payment = Payment(
        user_id=customer.id,
        order_id=order.id,
        razorpay_order_id="order_test_12345",
        razorpay_payment_id="pay_test_67890",
        amount=Decimal("1299.00"),
        currency="INR",
        status="SUCCESS",
        payment_method="razorpay",
    )
    db.add(payment)
    db.commit()

    res = client.get("/api/admin/payments", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["razorpay_payment_id"] == "pay_test_67890"
    assert data["items"][0]["order_number"] == "CG-20261112-TEST01"
    assert data["items"][0]["user_email"] == customer.email


def test_admin_inventory_and_stock_update(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)

    p1 = Product(
        title="Custom Name Mug",
        slug="custom-name-mug",
        category="Mugs",
        price=Decimal("299.00"),
        stock=2,  # low stock
        description="Ceramic mug with custom printed name.",
        is_active=True,
    )
    p2 = Product(
        title="Sold Out Hamper",
        slug="sold-out-hamper",
        category="Hampers",
        price=Decimal("1499.00"),
        stock=0,  # out of stock
        description="Luxury celebration gift hamper.",
        is_active=True,
    )
    db.add_all([p1, p2])
    db.commit()

    # Query inventory
    res = client.get("/api/admin/inventory?filter=low_stock", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert any(item["id"] == p1.id for item in data["items"])
    assert not any(item["id"] == p2.id for item in data["items"])

    # Update stock
    res_update = client.patch(
        f"/api/admin/inventory/{p1.id}",
        headers=headers,
        json={"stock": 25},
    )
    assert res_update.status_code == 200
    assert res_update.json()["stock"] == 25
    assert res_update.json()["is_low_stock"] is False


def test_admin_categories_and_rename(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)

    p = Product(
        title="Love Photo Frame",
        slug="love-photo-frame",
        category="Vintage Frames",
        price=Decimal("499.00"),
        stock=15,
        description="Heart shape engraved wooden photo frame.",
        is_active=True,
    )
    db.add(p)
    db.commit()

    res = client.get("/api/admin/categories", headers=headers)
    assert res.status_code == 200
    cats = res.json()
    assert any(c["name"] == "Vintage Frames" for c in cats)

    # Rename category
    rename_res = client.patch(
        "/api/admin/categories/rename",
        headers=headers,
        json={"old_name": "Vintage Frames", "new_name": "Frames"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["affected_products"] == 1

    db.refresh(p)
    assert p.category == "Frames"


def test_admin_user_status_and_self_protection(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)
    customer = create_customer(db, email="active_cust@example.com")

    # Deactivate customer
    res = client.patch(
        f"/api/admin/users/{customer.id}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Prevent admin self-deactivation
    self_deact = client.patch(
        f"/api/admin/users/{admin.id}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert self_deact.status_code == 400
    assert "cannot deactivate" in self_deact.json()["detail"].lower()


def test_admin_store_settings_and_public_whatsapp(client, db):
    admin = create_admin(db)
    headers = admin_headers(admin)

    # Get settings
    res = client.get("/api/admin/settings", headers=headers)
    assert res.status_code == 200
    assert res.json()["whatsapp_number"] == "8485089678"
    assert res.json()["whatsapp_country_code"] == "91"

    # Update settings
    res_update = client.patch(
        "/api/admin/settings",
        headers=headers,
        json={
            "whatsapp_number": "8485089678",
            "whatsapp_country_code": "91",
            "store_name": "CustomGift Official",
        },
    )
    assert res_update.status_code == 200
    assert res_update.json()["store_name"] == "CustomGift Official"

    # Public endpoint test (no auth required)
    pub_res = client.get("/api/settings/whatsapp")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["number"] == "8485089678"
    assert pub_data["country_code"] == "91"
    assert "8485089678" in pub_data["full_number"]
