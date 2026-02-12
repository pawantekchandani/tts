from database import engine
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_created_at_column():
    try:
        with engine.connect() as connection:
            logger.info("Attempting to add 'created_at' column to 'users' table...")
            # MySQL syntax
            connection.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
            connection.commit()
            logger.info("Successfully added 'created_at' column.")
    except Exception as e:
        logger.error(f"Error adding column (it might already exist): {e}")

if __name__ == "__main__":
    add_created_at_column()
