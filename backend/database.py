from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path
import logging

# --- 1. SETUP LOGGER ---
logger = logging.getLogger("database")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app_errors.log"),
        logging.StreamHandler()
    ]
)

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found!")

# ==========================================
# 🚀 FINAL FIX: FORCE DRIVER & HANDSHAKE 🚀
# ==========================================
# 1. Ensure we use the correct driver
if "mysql+pymysql" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("mysql+pymysql", "mysql+mysqlconnector")
elif "mysql://" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+mysqlconnector://")

# 2. Add charset to URL (Layer 1 Security)
if "charset=utf8mb4" not in DATABASE_URL:
    if "?" in DATABASE_URL:
        DATABASE_URL += "&charset=utf8mb4"
    else:
        DATABASE_URL += "?charset=utf8mb4"


logger.info("Database URL loaded successfully (Password hidden).")

try:
    connect_args = {}
    if "mysql" in DATABASE_URL:
        connect_args = {
            "charset": "utf8mb4", 
            "collation": "utf8mb4_unicode_ci",
            "init_command": "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        }

    # 3. THE MAGIC FIX: init_command
    # We pass 'init_command' inside connect_args for MySQL. 
    # This runs AUTOMATICALLY at the driver level, guaranteed.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=connect_args
    )

    # Test connection immediately
    with engine.connect() as connection:
        logger.info("Database connection established successfully.")

except Exception as e:
    logger.critical(f"FAILED TO CONNECT: {str(e)}")
    raise e

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