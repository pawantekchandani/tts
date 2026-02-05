import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# .env se password uthayega
load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Users ka data nikalo
        result = connection.execute(text("SELECT id, email FROM users"))
        rows = result.fetchall()
        
        print(f"\n--- TOTAL USERS: {len(rows)} ---")
        if len(rows) == 0:
            print("Database bilkul khaali hai! (0 Users)")
        else:
            print(f"{'ID':<5} | {'EMAIL'}")
            print("-" * 30)
            for row in rows:
                print(f"{row[0]:<5} | {row[1]}")
        print("-------------------------\n")

except Exception as e:
    print(f"Error: {e}")