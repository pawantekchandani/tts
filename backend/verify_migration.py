from database import engine
from sqlalchemy import inspect, text

def check_schema():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables found:", tables)
    
    if "transactions" in tables:
        print("SUCCESS: transactions table exists.")
        cols = [c['name'] for c in inspector.get_columns("transactions")]
        print("Transactions columns:", cols)
    else:
        print("ERROR: transactions table missing.")

    if "users" in tables:
        cols = [c['name'] for c in inspector.get_columns("users")]
        if "is_admin" in cols:
            print("SUCCESS: is_admin column exists in users table.")
        else:
            print("ERROR: is_admin column missing in users table.")
    else:
        print("ERROR: users table missing.")

if __name__ == "__main__":
    check_schema()
