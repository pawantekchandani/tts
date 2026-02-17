from fastapi.testclient import TestClient

def test_signup_success(client: TestClient):
    """Test successful user registration."""
    response = client.post(
        "/api/signup",
        json={"email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_signup_duplicate_email(client: TestClient):
    """Test that registering with an existing email fails."""
    # Register first user
    client.post(
        "/api/signup",
        json={"email": "duplicate@example.com", "password": "password123"}
    )
    # Attempt to register with same email
    response = client.post(
        "/api/signup",
        json={"email": "duplicate@example.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_success(client: TestClient):
    """Test successful login with correct credentials."""
    # Register user
    client.post(
        "/api/signup",
        json={"email": "login@example.com", "password": "password123"}
    )
    # Login
    response = client.post(
        "/api/login",
        json={"email": "login@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client: TestClient):
    """Test login failure with incorrect password."""
    # Register user
    client.post(
        "/api/signup",
        json={"email": "wrongpass@example.com", "password": "password123"}
    )
    # Login with wrong password
    response = client.post(
        "/api/login",
        json={"email": "wrongpass@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid password"

def test_login_non_existent_email(client: TestClient):
    """Test login failure with non-existent email."""
    response = client.post(
        "/api/login",
        json={"email": "nonexistent@example.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email is not registered"
