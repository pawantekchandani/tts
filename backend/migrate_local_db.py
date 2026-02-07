from database import engine, Base
import models
import logging

logging.basicConfig(level=logging.INFO)
print("Creating tables in local database...")
try:
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
except Exception as e:
    print(f"Error creating tables: {e}")
