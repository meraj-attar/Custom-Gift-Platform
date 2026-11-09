from app.core.security import hash_password
from app.models import User


def test_customer_cannot_create_product(client):
    register = client.post("/api/auth/register", json={"name": "Customer", "email": "customer@example.com", "password": "Secure123"})
    headers = {"Authorization": f"Bearer {register.json()['access_token']}"}
    response = client.post("/api/products", headers=headers, json={
        "title": "Admin only", "category": "Test", "price": 100, "description": "A sufficiently long description", "stock": 1
    })
    assert response.status_code == 403
