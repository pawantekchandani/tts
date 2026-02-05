import os
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import DownloadedFile

# Try to fetch data just like the API does
db = SessionLocal()
try:
    print("Attempting to fetch downloads...")
    downloads = db.query(DownloadedFile).all()
    print(f"Success! Found {len(downloads)} records.")
    for d in downloads:
        print(f"ID: {d.id}, Filename: {d.filename}")
except Exception as e:
    print("\n--- CRASH DETECTED ---")
    import traceback
    traceback.print_exc()
finally:
    db.close()