import sys
import os
from sqlalchemy import text

# Add backend to path to import database connection
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.database import engine
    
    with engine.connect() as connection:
        print("\n--- Connecting to MySQL Database ---")
        
        # Query users
        # Using text() for raw SQL query
        result = connection.execute(text("SELECT id, email FROM users"))
        users = result.fetchall()
        
        if not users:
            print("No users found in the database yet.")
        else:
            print(f"\nFound {len(users)} registered users:\n")
            print(f"{'ID':<5} | {'Email'}")
            print("-" * 30)
            for user in users:
                print(f"{user.id:<5} | {user.email}")
                
except Exception as e:
    print(f"Error: {e}")
    # If table doesn't exist, it means we need to run init_db.py
    if "doesn't exist" in str(e):
        print("\nTip: It looks like the tables don't exist yet. Running user table creation...")
