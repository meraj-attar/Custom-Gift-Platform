from decimal import Decimal

from app.models import Product


def register(client, email="wishlist@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Wishlist User",
            "email": email,
            "password": "Secure123",
            "phone": "9999999999",
            "address": "Pune",
        },
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def product(db, slug="wishlist-gift"):
    item = Product(
        title="Wishlist Gift",
        slug=slug,
        category="Keepsakes",
        price=Decimal("799.00"),
        description="A premium keepsake used to test persistent wishlist behavior.",
        stock=10,
        customizable=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_wishlist_requires_authentication(client):
    assert client.get("/api/wishlist").status_code == 401


def test_wishlist_add_list_remove_and_is_user_scoped(client, db):
    gift = product(db)
    first_headers = register(client, "first@example.com")
    second_headers = register(client, "second@example.com")

    added = client.post(f"/api/wishlist/{gift.id}", headers=first_headers)
    assert added.status_code == 200
    assert added.json()["id"] == gift.id

    # Adding the same product twice is idempotent.
    assert client.post(f"/api/wishlist/{gift.id}", headers=first_headers).status_code == 200
    first_list = client.get("/api/wishlist", headers=first_headers)
    assert first_list.status_code == 200
    assert [item["id"] for item in first_list.json()] == [gift.id]

    # A different customer cannot see someone else's saved gifts.
    second_list = client.get("/api/wishlist", headers=second_headers)
    assert second_list.status_code == 200
    assert second_list.json() == []

    removed = client.delete(f"/api/wishlist/{gift.id}", headers=first_headers)
    assert removed.status_code == 204
    assert client.get("/api/wishlist", headers=first_headers).json() == []
