from database import engine, SessionLocal
from models import Base, User, Transaction
from sqlalchemy import text, inspect
import sys

def run_migration():
    print("Starting migration process...")
    
    # 1. Create new tables (like Transaction) if they don't exist
    print("Checking for new tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables check complete.")

    # 2. Alter existing Users table to add is_admin column
    print("Checking users table schema...")
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'is_admin' not in columns:
        print("Adding is_admin column to users table...")
        with engine.connect() as conn:
            # MySQL syntax for adding a boolean column
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0"))
            conn.commit()
        print("Column is_admin added successfully.")
    else:
        print("Column is_admin already exists.")

    # 3. Mark specific user as admin
    # You can pass the email as a command line argument or input it interactively
    if len(sys.argv) > 1:
        target_email = sys.argv[1]
    else:
        target_email = input("Enter the email address to mark as Admin: ").strip()

    if target_email:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == target_email).first()
            if user:
                user.is_admin = True
                db.commit()
                print(f"SUCCESS: User '{target_email}' has been marked as ADMIN.")
            else:
                print(f"WARNING: User '{target_email}' not found in database.")
        except Exception as e:
            print(f"ERROR: Failed to update user. Details: {e}")
        finally:
            db.close()
    else:
        print("No email provided. Skipping admin assignment.")

if __name__ == "__main__":
    run_migration()
