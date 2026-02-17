import pytest
from unittest.mock import MagicMock, patch
import os
import sys
from datetime import datetime

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils import check_user_limits, smart_split, send_email

class TestUtils:
    
    # --- check_user_limits Tests ---



    # --- smart_split Tests ---

    def test_smart_split_short_text(self):
        text = "Short text."
        chunks = smart_split(text, limit=50)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_smart_split_exact_limit(self):
        text = "0123456789"
        chunks = smart_split(text, limit=10)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_smart_split_punctuation(self):
        text = "Hello world. This is a test."
        # Limit to force split after first sentence
        # "Hello world." is 12 chars
        chunks = smart_split(text, limit=15)
        
        assert len(chunks) == 2
        assert chunks[0] == "Hello world."
        assert chunks[1] == "This is a test."

    def test_smart_split_space_fallback(self):
        text = "Hello world This is a test"
        # No punctuation. Should split at space.
        chunks = smart_split(text, limit=12)
        # "Hello world" is 11 chars
        
        assert chunks[0] == "Hello world"
        assert chunks[1] == "This is a test"

    def test_smart_split_force_break(self):
        text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        # No space, no punc. Force split.
        chunks = smart_split(text, limit=10)
        
        assert chunks[0] == "ABCDEFGHIJ"
        assert chunks[1] == "KLMNOPQRST"
        assert chunks[2] == "UVWXYZ"

    # --- send_email Tests ---

    def test_send_email_testing_mode(self, capsys):
        """Verify email is NOT sent via SMTP in testing mode."""
        with patch.dict(os.environ, {"TESTING": "True"}):
            result = send_email("test@test.com", "Subject", "Body")
            
            assert result is True
            captured = capsys.readouterr()
            # Check stderr for logger output
            assert "TESTING MODE" in captured.err


