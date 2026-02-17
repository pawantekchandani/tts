import pytest
from unittest.mock import patch, MagicMock
from database import get_db

class TestDatabaseErrors:
    
    @patch('database.SessionLocal')
    def test_get_db_session_error(self, mock_session_local):
        """Test that get_db logs an error and re-raises exception if session fails."""
        # Setup mock session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Simulate an error during session usage
        # We need to manually iterate the generator to trigger the enter/exit logic
        generator = get_db()
        
        # 1. Get the session (next)
        session = next(generator)
        assert session == mock_db
        
        # 2. Simulate raising an exception inside the 'try' block of the user code
        #    Tests check if the 'except' block in 'get_db' catches it.
        #    Actually, `get_db` is a generator. The exception happens when the generator is active.
        
        with patch('database.logger') as mock_logger:
            try:
                # Throw exception back into the generator to simulate error in `yield`
                generator.throw(Exception("DB Connection Lost"))
            except Exception as e:
                assert str(e) == "DB Connection Lost"
            
            # Verify logger.error was called
            # Use any partial match for the message since it includes the exception string
            mock_logger.error.assert_called()
            args, _ = mock_logger.error.call_args
            assert "Database Session Error" in args[0]
            assert "DB Connection Lost" in args[0]
            
            # Verify db.close() was called in finally block
            mock_db.close.assert_called_once()
