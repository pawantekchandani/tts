import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from models import User, Conversion, Transaction, PlanLimits

def test_history_trimming(client: TestClient, db_session):
    """Test that the history endpoint respects plan history days limits."""
    # 1. Setup User
    email = "history@test.com"
    client.post("/api/signup", json={"email": email, "password": "password123"})
    login = client.post("/api/login", json={"email": email, "password": "password123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Seed plans so the Basic plan's rules (7 days retention) apply
    from seed_plans import seed_plans
    seed_plans(db_session)
    
    user = db_session.query(User).filter(User.email == email).first()
    
    # Need to manually insert conversions
    # - 1 recent conversion (1 day ago)
    # - 1 old conversion (10 days ago) - should be hidden
    now = datetime.utcnow()
    recent_date = now - timedelta(days=1)
    old_date = now - timedelta(days=10)
    
    recent_conv = Conversion(text="Recent", voice_name="Joanna", audio_url="/url1", user_id=user.id, created_at=recent_date)
    old_conv = Conversion(text="Old", voice_name="Joanna", audio_url="/url2", user_id=user.id, created_at=old_date)
    
    db_session.add(recent_conv)
    db_session.add(old_conv)
    db_session.commit()
    
    # 2. Call history endpoint
    response = client.get("/api/history", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # 3. Verify logic (only the Recent conversion should be returned)
    assert len(data) == 1
    assert data[0]["text"] == "Recent"

def test_history_pagination_and_search(client: TestClient, db_session):
    """Test history API pagination and text-based search filtering."""
    # Setup user
    email = "search@test.com"
    client.post("/api/signup", json={"email": email, "password": "password123"})
    login = client.post("/api/login", json={"email": email, "password": "password123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    from seed_plans import seed_plans
    seed_plans(db_session)
    
    user = db_session.query(User).filter(User.email == email).first()
    
    now = datetime.utcnow()
    
    # Add multiple conversions
    for i in range(15):
        c = Conversion(text=f"Test {i}", voice_name="Joanna", audio_url=f"/url{i}", user_id=user.id, created_at=now)
        db_session.add(c)
    
    # Add one specific for search
    target = Conversion(text="FindMe Please", voice_name="Joanna", audio_url="/findme", user_id=user.id, created_at=now)
    db_session.add(target)
    db_session.commit()
    
    # Test Pagination (10 per page default)
    res1 = client.get("/api/history?page=1&limit=10", headers=headers)
    assert res1.status_code == 200
    assert len(res1.json()) == 10
    
    res2 = client.get("/api/history?page=2&limit=10", headers=headers)
    assert res2.status_code == 200
    assert len(res2.json()) == 6
    
    # Test Search
    res_search = client.get("/api/history?search=FindMe", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["text"] == "FindMe Please"
