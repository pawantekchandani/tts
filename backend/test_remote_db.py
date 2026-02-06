from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection Details
DB_USER = "rseivuhw_dbuser"
DB_PASS = quote_plus("Deepak@123") # URL Encode the password!
DB_HOST = "flawless.herosite.pro" 
DB_NAME = "rseivuhw_polydb"

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

def test_connection():
    try:
        logger.info(f"Attempting to connect to {DB_HOST} with encoded password...")
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 10})
        with engine.connect() as connection:
            logger.info("Successfully connected to the remote database!")
            
            # Verify the voice_name column exists
            result = connection.execute(text("SHOW COLUMNS FROM conversions LIKE 'voice_name'"))
            if result.fetchone():
                logger.info("Confirmed: 'voice_name' column exists.")
            else:
                logger.warning("'voice_name' column NOT found.")

    except Exception as e:
        logger.error(f"Connection failed: {e}")
        print("\n\nNOTE: If this is 'Access denied', you need to add your IP to 'Remote MySQL' in cPanel.")

if __name__ == "__main__":
    test_connection()
