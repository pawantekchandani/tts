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

            # Check for 'created_at' column
            if "created_at" not in columns:
                logger.info("Migration: Adding 'created_at' column to 'users' table...")
                with engine.connect() as conn:
                    # Add DATETIME column with default current timestamp
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
                    conn.commit()
                logger.info("Migration: 'created_at' column added successfully.")
            else:
                logger.info("Schema Check: 'created_at' column already exists.")

            # Check for 'credits_used' column
            if "credits_used" not in columns:
                logger.info("Migration: Adding 'credits_used' column to 'users' table...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN credits_used INTEGER DEFAULT 0"))
                    conn.commit()
                logger.info("Migration: 'credits_used' column added successfully.")
            else:
                logger.info("Schema Check: 'credits_used' column already exists.")

            # Check if 'transactions' table exists
            if not inspector.has_table("transactions"):
                logger.warning("Migration Warning: 'transactions' table missing! Base.metadata.create_all() should have created it.")
                # Force creation of transactions table specifically if missing
                try:
                    from models import Transaction
                    Transaction.__table__.create(engine)
                    logger.info("Migration: 'transactions' table created successfully.")
                except Exception as e:
                    logger.error(f"Migration Error: Failed to create 'transactions' table: {e}")

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
