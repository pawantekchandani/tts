import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

import random
import string

def generate_user_id(length=5):
    """Generate a random alphanumeric string of fixed length."""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def _truncate_password(password: str) -> str:
    """Truncate password to 72 bytes to comply with bcrypt limit."""
    if not password:
        return password
    
    password_bytes = password.encode('utf-8')
    original_len = len(password_bytes)
    
    if len(password_bytes) > 72:
        # Truncate to exactly 72 bytes
        password_bytes = password_bytes[:72]
        # Decode back, handling any incomplete UTF-8 sequences at the end
        # Remove bytes from the end until we get a valid UTF-8 sequence
        while len(password_bytes) > 0:
            try:
                password = password_bytes.decode('utf-8')
                # Verify the decoded password is <= 72 bytes
                if len(password.encode('utf-8')) <= 72:
                    print(f"[AUTH] Password truncated from {original_len} to {len(password.encode('utf-8'))} bytes")
                    return password
            except UnicodeDecodeError:
                pass
            # Remove last byte and try again
            password_bytes = password_bytes[:-1]
        
        # Fallback: use replace to handle any remaining issues
        password = password_bytes.decode('utf-8', errors='replace')
        final_len = len(password.encode('utf-8'))
        print(f"[AUTH] Password truncated from {original_len} to {final_len} bytes (with fallback)")
        return password
    
    return password

def hash_password(password: str) -> str:
    # Bcrypt has a strict 72-byte limit - truncate BEFORE hashing
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Truncate password to 72 bytes if needed
    password = _truncate_password(password)
    
    # Double-check byte length before hashing
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        raise ValueError(f"Password cannot be truncated properly. Length: {len(password_bytes)} bytes")
    
    print(f"[AUTH] Hashing password of {len(password_bytes)} bytes")
    # Use bcrypt directly instead of passlib
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a 72-byte limit - truncate BEFORE verifying
    plain_password = _truncate_password(plain_password)
    plain_password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    # Use bcrypt directly instead of passlib
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
