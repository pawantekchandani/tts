import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from models import User, PasswordReset

def test_forgot_password_flow(client: TestClient, db_session):
    """Test the end-to-end forgot/reset password flow."""
    # 1. Signup a user
    email = "resetmeplease@test.com"
    client.post("/api/signup", json={"email": email, "password": "oldpassword"})
    
    # 2. Request forgot password
    res = client.post("/api/forgot-password", json={"email": email})
    assert res.status_code == 200
    assert "Reset link sent" in res.json()["message"]
    
    # 3. Verify token was created in DB
    reset_entry = db_session.query(PasswordReset).filter(PasswordReset.email == email).first()
    assert reset_entry is not None
    assert reset_entry.token is not None
    assert reset_entry.expires_at > datetime.utcnow()
    
    token = reset_entry.token
    
    # 4. Reset password using token
    res_reset = client.post("/api/reset-password", json={"token": token, "new_password": "newpassword123"})
    assert res_reset.status_code == 200
    assert "Password updated successfully" in res_reset.json()["message"]
    
    # 5. Verify old password fails, new password succeeds
    login_old = client.post("/api/login", json={"email": email, "password": "oldpassword"})
    assert login_old.status_code == 401
    
    login_new = client.post("/api/login", json={"email": email, "password": "newpassword123"})
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()
    
    # 6. Verify token is deleted after use
    assert db_session.query(PasswordReset).filter(PasswordReset.token == token).first() is None


def test_reset_password_invalid_token(client: TestClient):
    """Test rejecting a totally invalid password reset token."""
    res = client.post("/api/reset-password", json={"token": "invalid_fake_token", "new_password": "newpassword"})
    assert res.status_code == 400
    assert "Invalid or expired token" in res.json()["detail"]


def test_reset_password_expired_token(client: TestClient, db_session):
    """Test rejecting an expired password reset token."""
    email = "expired@test.com"
    client.post("/api/signup", json={"email": email, "password": "password"})
    
    # Manually insert expired token
    expired_token = "expired_token_123"
    past_date = datetime.utcnow() - timedelta(hours=2)
    entry = PasswordReset(email=email, token=expired_token, expires_at=past_date)
    db_session.add(entry)
    db_session.commit()
    
    res = client.post("/api/reset-password", json={"token": expired_token, "new_password": "newpassword"})
    assert res.status_code == 400
    assert "Invalid or expired token" in res.json()["detail"]
