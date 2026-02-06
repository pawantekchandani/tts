from sqlalchemy import create_engine, event  # <--- Updated import
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path
import logging

# --- 1. SETUP LOGGER FOR DATABASE ---
# This ensures DB errors also go to the same 'app_errors.log' file
logger = logging.getLogger("database")
# We assume basicConfig is already called in main.py, but we can ensure it here too just in case
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app_errors.log"),
        logging.StreamHandler()
    ]
)

# Load .env from backend folder
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    error_msg = "DATABASE_URL not found in .env file!"
    logger.critical(error_msg)  # Log this critical error
    raise ValueError(error_msg)

# --- CONFIGURATION FIX ---
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"charset": "utf8mb4"}
    )
    
    # 100% Force UTF-8 on every new connection
    @event.listens_for(engine, "connect")
    def set_utf8mb4_encoding(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("SET NAMES 'utf8mb4'")
        cursor.execute("SET CHARACTER SET utf8mb4")
        cursor.close()
    
    # Optional: Test connection immediately to catch errors early
    with engine.connect() as connection:
        logger.info("Database connection established successfully.")
        
except Exception as e:
    logger.critical(f"FAILED TO CONNECT TO DATABASE: {str(e)}")
    raise e
# -------------------------

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database Session Error: {str(e)}")
        raise
    finally:
        db.close()