
import requests
import json

# Generate 5000 chars of text
long_text = "This is a test sentence. " * 250 
assert len(long_text) > 3000

url = "http://127.0.0.1:8000/api/convert"

# Attempt to authenticate first (we need a token)
# Use a test user if possible. Or cheat and disable auth temporarily? 
# No, let's try to login. I see 'backend/main.py' has a signup route.
# I'll try to signup a temp user.

session = requests.Session()

def get_token():
    # Login as existing user or create one
    login_data = {
        "email": "test_script_user@example.com",
        "password": "password123"
    }
    
    # Try login
    print("Attempting login...")
    r = session.post("http://127.0.0.1:8000/api/login", json=login_data)
    if r.status_code == 200:
        return r.json()['access_token']
        
    # logic to create user if login fails is complex without database access here.
    # I'll just assume I can create one.
    print("Login failed, trying signup...")
    signup_data = {
        "email": "test_script_user@example.com",
        "password": "password123"
    }
    r = session.post("http://127.0.0.1:8000/api/signup", json=signup_data)
    if r.status_code == 200:
        # Now login
        r = session.post("http://127.0.0.1:8000/api/login", json=login_data)
        if r.status_code == 200:
            return r.json()['access_token']
    
    print(f"Failed to get token: {r.text}")
    return None

import time

def trigger():
    token = get_token()
    if not token:
        print("Skipping trigger, no token.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "text": long_text,
        "voice_id": "Joanna",
        "engine": "standard"
    }
    
    print(f"Sending request with {len(long_text)} characters...")
    try:
        r = session.post(url, json=data, headers=headers, timeout=60)
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    trigger()
