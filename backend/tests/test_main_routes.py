import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

class TestMainRoutes:
    
    @pytest.fixture(autouse=True)
    def setup_mocks(self, db_session):
        """Mock Polly client mainly to avoid AWS credentials errors."""
        # Update: Seed plans to avoid 'System configuration error'
        from seed_plans import seed_plans
        seed_plans(db=db_session)

        with patch('main.polly_client') as mock_polly:
            self.mock_polly = mock_polly
            # Standard successful response structure
            mock_response = {
                'AudioStream': MagicMock()
            }
            mock_response['AudioStream'].read.return_value = b'fake_audio_content'
            self.mock_polly.synthesize_speech.return_value = mock_response
            yield

    def test_convert_text_success(self, client):
        """Test successful text-to-speech conversion."""
        # 1. Login to get token
        client.post("/api/signup", json={"email": "c1@test.com", "password": "password123"})
        login = client.post("/api/login", json={"email": "c1@test.com", "password": "password123"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Call Convert API
        payload = {
            "text": "Hello World",
            "voice_id": "Joanna",
            "engine": "standard"
        }
        response = client.post("/api/convert", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Hello World"
        assert "audio_url" in data

    def test_convert_empty_text(self, client):
        """Test conversion with empty text should fail."""
        client.post("/api/signup", json={"email": "c2@test.com", "password": "password123"})
        login = client.post("/api/login", json={"email": "c2@test.com", "password": "password123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        
        response = client.post("/api/convert", json={"text": "   "}, headers=headers)
        
        # Should be 400 Bad Request
        assert response.status_code == 400
        assert "be empty" in response.json()["detail"]



    def test_convert_insufficient_credits(self, client, db_session):
        """Test that conversion is blocked when user runs out of credits."""
        # 1. Setup User
        email = "nocredit@test.com"
        client.post("/api/signup", json={"email": email, "password": "password123"})
        login = client.post("/api/login", json={"email": email, "password": "password123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        
        # 2. Manually exhaust credits in DB
        from models import User, PlanLimits
        user = db_session.query(User).filter(User.email == email).first()
        # Basic plan limit is 3000
        user.credits_used = 3000 
        db_session.commit()
        
        # 3. Try to convert
        response = client.post("/api/convert", json={"text": "Should fail"}, headers=headers)
        
        assert response.status_code == 403
        assert "Credit limit reached" in response.json()["detail"]

    def test_download_file_flow(self, client, db_session):
        """Test the file download endpoint (lines 584-620)."""
        # 1. Setup User & Conversion
        email = "dl@test.com"
        client.post("/api/signup", json={"email": email, "password": "password123"})
        login = client.post("/api/login", json={"email": email, "password": "password123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        
        # Create a fake conversion directly in DB to download
        from models import Conversion, User
        from datetime import datetime
        user = db_session.query(User).filter(User.email == email).first()
        
        # Create a dummy file on disk so FileResponse works
        import pathlib
        static_dir = pathlib.Path(__file__).parent.parent / "static" / "audio" 
        static_dir.mkdir(parents=True, exist_ok=True)
        dummy_file = static_dir / "test.mp3"
        dummy_file.write_text("dummy content")
        
        fake_url = "/static/audio/test.mp3"
        
        conv = Conversion(
            text="xyz",
            audio_url=fake_url,
            user_id=user.id,
            created_at=datetime.utcnow()
        )
        db_session.add(conv)
        db_session.commit()
        
        # 2. Download
        response = client.get(f"/api/download/{conv.id}", headers=headers)
        
        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]

    def test_download_not_owned_file(self, client, db_session):
        """Test trying to download someone else's file."""
        # User 1 creates file
        client.post("/api/signup", json={"email": "u1@t.com", "password": "password123"})
        
        # Create conversion for User 1
        from models import Conversion, User
        u1 = db_session.query(User).filter(User.email == "u1@t.com").first()
        c = Conversion(text="a", audio_url="x", user_id=u1.id)
        db_session.add(c)
        db_session.commit()
        
        # User 2 tries to download
        client.post("/api/signup", json={"email": "u2@t.com", "password": "password123"})
        login = client.post("/api/login", json={"email": "u2@t.com", "password": "password123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        
        response = client.get(f"/api/download/{c.id}", headers=headers)
        
        assert response.status_code == 403
        assert "do not own" in response.json()["detail"]
