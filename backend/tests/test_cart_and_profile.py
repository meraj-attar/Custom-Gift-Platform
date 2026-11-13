from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import Product


def get_auth_headers(client: TestClient, email: str = "cart_tester@example.com"):
    res = client.post(
        "/api/auth/register",
        json={
            "name": "Cart Tester",
            "email": email,
            "password": "Password123!",
            "phone": "+91 98765 43210",
            "address": "123 Test Street, Mumbai 400001",
        },
    )
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_cart_endpoints_require_authentication(client: TestClient):
    """Unauthenticated calls to /api/cart must return 401 Unauthorized."""
    res_get = client.get("/api/cart")
    assert res_get.status_code == 401

    res_post = client.post("/api/cart/items", json={"product_id": 1, "quantity": 1})
    assert res_post.status_code == 401

    res_delete = client.delete("/api/cart")
    assert res_delete.status_code == 401


def test_authenticated_cart_flow(client: TestClient, db: Session):
    """Authenticated users can query, add items, and clear their cart session."""
    headers = get_auth_headers(client, "cart_user1@example.com")

    # Create a test product
    prod = Product(
        title="Test Cart Product",
        slug="test-cart-product",
        category="Mugs",
        price=Decimal("499.00"),
        description="A great test product.",
        stock=10,
        customizable=False,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    # 1. Get user cart
    res_get = client.get("/api/cart", headers=headers)
    assert res_get.status_code == 200
    assert "user_id" in res_get.json()

    # 2. Add active product to cart
    res_add = client.post(
        "/api/cart/items",
        headers=headers,
        json={"product_id": prod.id, "quantity": 1, "customization": {}},
    )
    assert res_add.status_code == 200
    assert res_add.json()["product"]["id"] == prod.id

    # 3. Add non-existent product returns 404
    res_not_found = client.post(
        "/api/cart/items",
        headers=headers,
        json={"product_id": 999999, "quantity": 1},
    )
    assert res_not_found.status_code == 404

    # 4. Clear cart
    res_clear = client.delete("/api/cart", headers=headers)
    assert res_clear.status_code == 200


def test_profile_update_and_change_password(client: TestClient):
    """Authenticated users can view, update their profile, and change their password."""
    headers = get_auth_headers(client, "profile_tester@example.com")

    # 1. GET /api/auth/me returns created_at
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert "created_at" in me_data
    assert me_data["created_at"] is not None

    # 2. PUT /api/auth/me updates name, phone, address
    res_update = client.put(
        "/api/auth/me",
        headers=headers,
        json={
            "name": "Updated Customer Name",
            "phone": "+91 98765 43210",
            "address": "456 Modern Tech Park, Bengaluru 560001",
        },
    )
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["name"] == "Updated Customer Name"
    assert updated_data["phone"] == "+919876543210"
    assert "Modern Tech Park" in updated_data["address"]

    # 3. Change password with incorrect current password fails
    res_bad_pw = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={
            "current_password": "WrongPassword123!",
            "new_password": "NewValidPassword123!",
            "confirm_password": "NewValidPassword123!",
        },
    )
    assert res_bad_pw.status_code == 400
    assert "Current password is incorrect" in res_bad_pw.json()["detail"]

    # 4. Change password with identical current password fails
    res_same_pw = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={
            "current_password": "Password123!",
            "new_password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert res_same_pw.status_code == 400
    assert "New password must be different" in res_same_pw.json()["detail"]

    # 5. Successful password change
    res_success_pw = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={
            "current_password": "Password123!",
            "new_password": "BrandNewSecretPassword123!",
            "confirm_password": "BrandNewSecretPassword123!",
        },
    )
    assert res_success_pw.status_code == 200
    assert res_success_pw.json()["message"] == "Password changed successfully."
