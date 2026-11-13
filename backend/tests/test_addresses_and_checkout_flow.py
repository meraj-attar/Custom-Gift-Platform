import pytest
from app.models import Address, Product, User


def get_auth_headers(client, email="checkout_user@example.com", password="Password@123", name="Checkout Tester"):
    client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "phone": "9876543210"},
    )
    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_saved_addresses_crud_and_isolation(client, db):
    headers_a = get_auth_headers(client, email="user_a@test.com")
    headers_b = get_auth_headers(client, email="user_b@test.com", name="User B")

    # 1. User A creates first address -> automatically becomes default
    addr1_payload = {
        "full_name": "User A First",
        "phone": "9876543210",
        "email": "user_a@test.com",
        "address_line1": "Flat 101, Sunshine Heights",
        "address_line2": "MG Road",
        "landmark": "Near City Mall",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "is_default": False,
    }
    res1 = client.post("/api/addresses", headers=headers_a, json=addr1_payload)
    assert res1.status_code == 201
    addr1 = res1.json()
    assert addr1["is_default"] is True
    assert addr1["state"] == "Maharashtra"

    # 2. User A creates second address
    addr2_payload = {
        "full_name": "User A Second",
        "phone": "9123456789",
        "email": "user_a@test.com",
        "address_line1": "Office 402, Tech Park",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "is_default": False,
    }
    res2 = client.post("/api/addresses", headers=headers_a, json=addr2_payload)
    assert res2.status_code == 201
    addr2 = res2.json()
    assert addr2["is_default"] is False

    # 3. User A lists addresses -> both returned with default first
    list_res = client.get("/api/addresses", headers=headers_a)
    assert list_res.status_code == 200
    addresses = list_res.json()
    assert len(addresses) == 2
    assert addresses[0]["id"] == addr1["id"]

    # 4. User B cannot see User A's addresses (User isolation)
    list_b = client.get("/api/addresses", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # User B cannot access User A's address directly
    get_b = client.get(f"/api/addresses/{addr1['id']}", headers=headers_b)
    assert get_b.status_code == 404

    # 5. User A sets Address 2 as default
    def_res = client.post(f"/api/addresses/{addr2['id']}/default", headers=headers_a)
    assert def_res.status_code == 200
    assert def_res.json()["is_default"] is True

    # Verify Address 1 is no longer default
    get1 = client.get(f"/api/addresses/{addr1['id']}", headers=headers_a)
    assert get1.json()["is_default"] is False

    # 6. User A updates address 1
    upd_res = client.put(
        f"/api/addresses/{addr1['id']}",
        headers=headers_a,
        json={"city": "Mumbai", "pincode": "400001"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["city"] == "Mumbai"
    assert upd_res.json()["pincode"] == "400001"

    # 7. User A deletes address 2 -> address 1 is promoted to default
    del_res = client.delete(f"/api/addresses/{addr2['id']}", headers=headers_a)
    assert del_res.status_code == 200
    get1_after = client.get(f"/api/addresses/{addr1['id']}", headers=headers_a)
    assert get1_after.json()["is_default"] is True


def test_address_validation_rules(client):
    headers = get_auth_headers(client, email="addr_val@test.com")

    # Invalid state
    res = client.post(
        "/api/addresses",
        headers=headers,
        json={
            "full_name": "Valid Name",
            "phone": "9876543210",
            "address_line1": "Valid street 123",
            "city": "Pune",
            "state": "NonExistentState123",
            "pincode": "411001",
        },
    )
    assert res.status_code == 422

    # Invalid phone (less than 10 digits or invalid starting digit)
    res_phone = client.post(
        "/api/addresses",
        headers=headers,
        json={
            "full_name": "Valid Name",
            "phone": "1234567890",
            "address_line1": "Valid street 123",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411001",
        },
    )
    assert res_phone.status_code == 422

    # Invalid PIN code (5 digits)
    res_pin = client.post(
        "/api/addresses",
        headers=headers,
        json={
            "full_name": "Valid Name",
            "phone": "9876543210",
            "address_line1": "Valid street 123",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "41100",
        },
    )
    assert res_pin.status_code == 422


def test_order_creation_with_delivery_options_and_isolation(client, db):
    headers_u1 = get_auth_headers(client, email="order_u1@test.com", name="Order User One")
    headers_u2 = get_auth_headers(client, email="order_u2@test.com", name="Order User Two")

    # Create test product
    product = Product(
        title="Gifting Box Test",
        slug="gifting-box-test",
        category="Hampers",
        price=500.0,
        description="Premium gifting box for tests",
        rating=4.8,
        discount_percent=0,
        stock=10,
        customizable=False,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # 1. Standard Delivery (Shipping = 0)
    order_std_payload = {
        "name": "Order User One",
        "phone": "9876543210",
        "email": "order_u1@test.com",
        "address": "Flat 12, Park View",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "delivery_option": "standard",
        "payment_method": "cod",
        "items": [{"product_id": product.id, "quantity": 1}],
    }
    res_std = client.post("/api/orders", headers=headers_u1, json=order_std_payload)
    assert res_std.status_code == 201
    order_std = res_std.json()
    assert float(order_std["shipping_fee"]) == 0.0
    assert float(order_std["subtotal"]) == 500.0
    assert float(order_std["total_amount"]) == 500.0
    assert order_std["delivery_option"] == "standard"
    assert "4–6 Business Days" in order_std["estimated_delivery"]

    # 2. Express Delivery (Shipping = 99)
    order_exp_payload = {
        "name": "Order User One",
        "phone": "9876543210",
        "email": "order_u1@test.com",
        "address": "Flat 12, Park View",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "delivery_option": "express",
        "payment_method": "cod",
        "items": [{"product_id": product.id, "quantity": 1}],
    }
    res_exp = client.post("/api/orders", headers=headers_u1, json=order_exp_payload)
    assert res_exp.status_code == 201
    order_exp = res_exp.json()
    assert float(order_exp["shipping_fee"]) == 99.0
    assert float(order_exp["subtotal"]) == 500.0
    assert float(order_exp["total_amount"]) == 599.0
    assert order_exp["delivery_option"] == "express"
    assert "2–3 Business Days" in order_exp["estimated_delivery"]

    # 3. User 1 cannot use User 2's saved address in order placement
    addr_u2 = client.post(
        "/api/addresses",
        headers=headers_u2,
        json={
            "full_name": "User Two Recipient",
            "phone": "9876543211",
            "address_line1": "User Two Road 45",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001",
        },
    ).json()

    stolen_addr_payload = {
        **order_std_payload,
        "saved_address_id": addr_u2["id"],
    }
    res_stolen = client.post("/api/orders", headers=headers_u1, json=stolen_addr_payload)
    assert res_stolen.status_code == 404
