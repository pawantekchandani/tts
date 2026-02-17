import pytest
import os
import sys
from datetime import timedelta
from unittest.mock import patch

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token,
    _truncate_password
)

class TestAuthInternals:

    def test_hash_password_empty(self):
        """Test hashing empty password raises ValueError."""
        # Line 58
        with pytest.raises(ValueError, match="Password cannot be empty"):
            hash_password("")

    def test_truncate_password_logic(self):
        """Test truncation of very long passwords (>72 bytes)."""
        # Lines 32-51
        long_password = "a" * 100
        truncated = _truncate_password(long_password)
        
        # Verify length is capped
        assert len(truncated.encode('utf-8')) <= 72
        
        # Verify hashing still works seamlessly with long input
        hashed = hash_password(long_password)
        assert verify_password(long_password, hashed)
        
        # Verify verification fails if we mess with the password (must change within first 72 chars)
        assert not verify_password("x" + long_password, hashed)

    def test_truncate_password_empty_direct(self):
        """Test _truncate_password with empty string directly."""
        # Line 25
        assert _truncate_password("") == ""
        assert _truncate_password(None) is None

    def test_create_access_token_with_expiry(self):
        """Test token creation with explicit expiration."""
        # Line 85
        delta = timedelta(minutes=60)
        token = create_access_token({"sub": "test_user"}, expires_delta=delta)
        assert token is not None
        
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test_user"

    def test_verify_token_invalid_structure(self):
        """Test verify_token with garbage string."""
        # Lines 94-98 (JWTError caught)
        assert verify_token("this.is.not.a.valid.token") is None

    def test_verify_token_expired(self):
        """Test verify_token with an expired token."""
        # Lines 94-98 (ExpiredSignatureError is a subclass of JWTError)
        delta = timedelta(minutes=-5) # Expired 5 mins ago
        token = create_access_token({"sub": "expired_user"}, expires_delta=delta)
        
        result = verify_token(token)
        assert result is None

    def test_hash_password_truncation_failure(self):
        """Test safeguard if truncation magically fails to return <72 bytes."""
        # Line 66
        with patch('auth._truncate_password', return_value="a" * 80):
            with pytest.raises(ValueError, match="Password cannot be truncated properly"):
                hash_password("any_input")

    def test_verify_password_long_input(self):
        """Test verify_password handles long input correctly (implicit truncation)."""
        long_pass = "b" * 100
        hashed = hash_password(long_pass)
        
        # Should return True because verify_password also truncates input before checking
        assert verify_password(long_pass, hashed) is True
