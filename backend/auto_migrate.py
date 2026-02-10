from sqlalchemy import inspect, text
from database import engine, SessionLocal
from models import User
import logging

logger = logging.getLogger(__name__)

def run_auto_migrations():
    """
    Checks for missing columns/tables and updates the schema automatically.
    This is useful for adding columns to existing tables without wiping data.
    """
    try:
        logger.info("Checking for schema updates...")
        inspector = inspect(engine)
        
        # 1. Check if 'users' table exists
        if inspector.has_table("users"):
            columns = [col['name'] for col in inspector.get_columns("users")]
            
            # Check for 'is_admin' column
            if "is_admin" not in columns:
                logger.info("Migration: Adding 'is_admin' column to 'users' table...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0"))
                    conn.commit()  # Use commit explicitly for DDL if needed, though execute usually auto-commits in some drivers
                logger.info("Migration: 'is_admin' column added successfully.")
            else:
                logger.info("Schema Check: 'is_admin' column already exists.")

            # 2. Grant Admin Access Automatically
            grant_admin_access("Admin@gmail.com")
                
        logger.info("Schema updates check complete.")
        
    except Exception as e:
        logger.error(f"Migration Failed: {str(e)}")

def grant_admin_access(email: str):
    """
    Ensures a specific user has admin privileges.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if not user.is_admin:
                user.is_admin = True
                db.commit()
                logger.info(f"✅ SUCCESS: Granted ADMIN access to {email}")
            else:
                logger.info(f"ℹ️ User {email} is already an admin.")
        else:
            logger.warning(f"⚠️ User {email} not found. Cannot grant admin access yet.")
    except Exception as e:
        logger.error(f"Failed to grant admin access to {email}: {e}")
    finally:
        db.close()
