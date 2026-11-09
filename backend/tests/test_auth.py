def test_register_login_and_me(client):
    register = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "Secure123",
        "phone": "9999999999",
        "address": "Pune",
    })
    assert register.status_code == 201
    token = register.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"

    login = client.post("/api/auth/login", json={"email": "test@example.com", "password": "Secure123"})
    assert login.status_code == 200


def test_duplicate_email_is_rejected(client):
    payload = {"name": "One User", "email": "same@example.com", "password": "Secure123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409
