from database import engine
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_voice_name_column():
    try:
        with engine.connect() as connection:
            logger.info("Attempting to add 'voice_name' column to 'conversions' table...")
            # MySQL syntax
            connection.execute(text("ALTER TABLE conversions ADD COLUMN voice_name VARCHAR(100) DEFAULT 'Joanna'"))
            connection.commit()
            logger.info("Successfully added 'voice_name' column.")
    except Exception as e:
        logger.error(f"Error adding column (it might already exist): {e}")

if __name__ == "__main__":
    add_voice_name_column()
