import pytest
import os
import requests
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

@pytest.fixture(autouse=True)
def setup_env_and_db(db_session, monkeypatch):
    from seed_plans import seed_plans
    seed_plans(db=db_session)
    
    # We set strict environment variables needed by the Azure logic
    monkeypatch.setenv("AZURE_SPEECH_KEY", "fake-azure-key")
    monkeypatch.setenv("AZURE_SPEECH_REGION", "eastus")

def test_azure_tts_success(client: TestClient, db_session):
    """Test successful Azure TTS generation by mocking the REST HTTP requests."""
    # 1. Setup User
    email = "azure@test.com"
    client.post("/api/signup", json={"email": email, "password": "password123"})
    login = client.post("/api/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # 2. Mock requests.post
    with patch('requests.post') as mock_post:
        # Create different mock responses for the issueToken request and the TTS request
        token_response_mock = MagicMock()
        token_response_mock.text = "fake-access-token"
        token_response_mock.raise_for_status.return_value = None
        
        tts_response_mock = MagicMock()
        tts_response_mock.status_code = 200
        tts_response_mock.content = b"fake-audio-bytes"

        # Side effect to return different values depending on the URL
        def side_effect(*args, **kwargs):
            url = args[0]
            if "issueToken" in url:
                return token_response_mock
            elif "cognitiveservices/v1" in url:
                return tts_response_mock
            return MagicMock()

        mock_post.side_effect = side_effect

        # 3. Call the conversion endpoint
        payload = {
            "text": "Hello Azure Neural.",
            "voice_id": "en-US-JennyNeural",
            "engine": "neural"
        }
        res = client.post("/api/convert", json=payload, headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == payload["text"]
        assert data["engine"] == "neural"
        assert "audio_url" in data
        assert "static/audio" in data["audio_url"]

def test_azure_tts_missing_config(client: TestClient, db_session, monkeypatch):
    """Test behavior when Azure environment variables are completely missing."""
    email = "azure2@test.com"
    client.post("/api/signup", json={"email": email, "password": "password123"})
    login = client.post("/api/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Deliberately remove the key
    monkeypatch.delenv("AZURE_SPEECH_KEY", raising=False)

    payload = {"text": "Fail me", "engine": "neural", "voice_id": "en-US-JennyNeural"}
    res = client.post("/api/convert", json=payload, headers=headers)

    assert res.status_code == 500
    assert "Azure Configuration Error" in res.json()["detail"]

def test_azure_tts_token_failure(client: TestClient, db_session):
    """Test fallback when Azure denies the token request (e.g. invalid key)."""
    email = "azure3@test.com"
    client.post("/api/signup", json={"email": email, "password": "password123"})
    login = client.post("/api/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    with patch('requests.post') as mock_post:
        # Simulate network error or 401 Unauthorized during token fetch
        mock_post.side_effect = requests.exceptions.RequestException("Connection error")

        payload = {"text": "Won't work", "engine": "neural"}
        res = client.post("/api/convert", json=payload, headers=headers)

        assert res.status_code == 500
        assert "Text-to-Speech Service Unavailable (Azure)" in res.json()["detail"]
