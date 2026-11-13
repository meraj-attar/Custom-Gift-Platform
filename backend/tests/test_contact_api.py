import pytest
from app.models import ContactMessage, User
from app.core.security import create_access_token


def test_contact_submission_success(client, db):
    payload = {
        "name": "Ananya Roy",
        "email": "ananya.roy@example.com",
        "subject": "Custom hamper inquiry for corporate event",
        "message": "We would like to order 50 customized gift hampers for our annual summit.",
    }
    response = client.post("/api/contact", json=payload)
    assert response.status_code == 201
    assert "received" in response.json()["message"].lower()

    # Verify database persistence
    msg = db.query(ContactMessage).filter(ContactMessage.email == "ananya.roy@example.com").first()
    assert msg is not None
    assert msg.name == "Ananya Roy"
    assert msg.status == "New"
    assert msg.is_read is False


def test_contact_honeypot_silently_ignored(client, db):
    payload = {
        "name": "Spam Bot",
        "email": "spambot@spam.com",
        "subject": "Buy cheap watches now",
        "message": "Visit our website for huge discounts on watches and crypto.",
        "honeypot": "https://spam.example.com",
    }
    response = client.post("/api/contact", json=payload)
    assert response.status_code == 201

    # Should not persist to database
    msg = db.query(ContactMessage).filter(ContactMessage.email == "spambot@spam.com").first()
    assert msg is None


def test_contact_duplicate_protection(client, db):
    payload = {
        "name": "Devendra Joshi",
        "email": "devendra.j@example.com",
        "subject": "Order tracking question",
        "message": "Can you check the delivery timeline for my photo frame order?",
    }
    # First submission
    resp1 = client.post("/api/contact", json=payload)
    assert resp1.status_code == 201

    # Immediate duplicate submission
    resp2 = client.post("/api/contact", json=payload)
    assert resp2.status_code == 201
    assert "already been received" in resp2.json()["message"].lower()

    # Only one record in database
    count = db.query(ContactMessage).filter(ContactMessage.email == "devendra.j@example.com").count()
    assert count == 1


def test_contact_validation_failures(client):
    # Name too short
    res = client.post("/api/contact", json={
        "name": "A",
        "email": "valid@example.com",
        "subject": "Valid Subject",
        "message": "This is a valid long message.",
    })
    assert res.status_code == 422

    # Name contains numbers
    res = client.post("/api/contact", json={
        "name": "User 123",
        "email": "valid@example.com",
        "subject": "Valid Subject",
        "message": "This is a valid long message.",
    })
    assert res.status_code == 422

    # Invalid email
    res = client.post("/api/contact", json={
        "name": "Valid Name",
        "email": "invalid-email",
        "subject": "Valid Subject",
        "message": "This is a valid long message.",
    })
    assert res.status_code == 422

    # Subject too short (<3)
    res = client.post("/api/contact", json={
        "name": "Valid Name",
        "email": "valid@example.com",
        "subject": "Hi",
        "message": "This is a valid long message.",
    })
    assert res.status_code == 422

    # Message too short (<10)
    res = client.post("/api/contact", json={
        "name": "Valid Name",
        "email": "valid@example.com",
        "subject": "Valid Subject",
        "message": "Short",
    })
    assert res.status_code == 422


def test_admin_contact_endpoints_authorization(client, db):
    # Public / unauthorized access must be rejected
    res = client.get("/api/admin/contact-messages")
    assert res.status_code in [401, 403]

    # Non-admin user access must be rejected
    customer = db.query(User).filter(User.role == "customer").first()
    if customer:
        token = create_access_token(customer.id, customer.role)
        res = client.get("/api/admin/contact-messages", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403


def test_admin_contact_management_workflow(client, db):
    # Get or create admin user
    admin = db.query(User).filter(User.role == "admin").first()
    if not admin:
        from app.core.security import hash_password
        admin = User(
            name="Super Admin",
            email="admin_contact_test@example.com",
            password_hash=hash_password("Secure123!"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    admin_token = create_access_token(admin.id, "admin")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create a test message
    msg = ContactMessage(
        name="Sunita Rao",
        email="sunita.rao@example.com",
        subject="Special anniversary customization",
        message="I would like to customize both sides of the lamp with two dates.",
        status="New",
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    msg_id = msg.id

    # 1. Admin lists messages
    list_res = client.get("/api/admin/contact-messages", headers=headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(m["id"] == msg_id for m in data["items"])

    # 2. Filter by status
    filter_res = client.get("/api/admin/contact-messages?status=New", headers=headers)
    assert filter_res.status_code == 200
    assert all(m["status"] == "New" for m in filter_res.json()["items"])

    # 3. Search by name
    search_res = client.get("/api/admin/contact-messages?search=Sunita", headers=headers)
    assert search_res.status_code == 200
    assert any(m["email"] == "sunita.rao@example.com" for m in search_res.json()["items"])

    # 4. View detail (marks as read)
    detail_res = client.get(f"/api/admin/contact-messages/{msg_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["is_read"] is True

    # 5. Update status to In Progress
    status_res = client.patch(
        f"/api/admin/contact-messages/{msg_id}/status",
        json={"status": "In Progress"},
        headers=headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "In Progress"

    # 6. Update status to Resolved
    resolved_res = client.patch(
        f"/api/admin/contact-messages/{msg_id}/status",
        json={"status": "Resolved"},
        headers=headers,
    )
    assert resolved_res.status_code == 200
    assert resolved_res.json()["status"] == "Resolved"

    # 7. Delete submission
    del_res = client.delete(f"/api/admin/contact-messages/{msg_id}", headers=headers)
    assert del_res.status_code == 200
    assert "deleted" in del_res.json()["message"].lower()

    # Confirm deletion
    get_del = client.get(f"/api/admin/contact-messages/{msg_id}", headers=headers)
    assert get_del.status_code == 404
