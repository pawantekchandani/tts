import mysql.connector
import os
import sys

def setup():
    print("Starting local environment setup...")

    # 1. Connect to MySQL and create database
    try:
        print("Connecting to MySQL...")
        mydb = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Deepak@123"
        )
        cursor = mydb.cursor()
        print("Creating database 'tts_local_db' if not exists...")
        cursor.execute("CREATE DATABASE IF NOT EXISTS tts_local_db")
        mydb.commit()
        cursor.close()
        mydb.close()
        print("Database 'tts_local_db' is ready.")
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        print("Please ensure MySQL is running and password is 'Deepak@123'")
        sys.exit(1)

    # 2. Update backend/.env
    env_path = os.path.join("backend", ".env")
    print(f"Updating {env_path}...")
    
    # We use mysql+mysqlconnector to match database.py logic
    # Password encoded: Deepak%40123
    new_db_url = "DATABASE_URL=mysql+mysqlconnector://root:Deepak%40123@localhost/tts_local_db?charset=utf8mb4"
    
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
    
    new_lines = []
    found = False
    for line in lines:
        if line.strip().startswith("DATABASE_URL="):
            new_lines.append(new_db_url + "\n")
            found = True
        else:
            new_lines.append(line)
    
    if not found:
        new_lines.append(new_db_url + "\n")
        
    with open(env_path, "w") as f:
        f.writelines(new_lines)
    print("backend/.env updated.")

    # 3. Create frontend/.env.development
    fe_env_path = os.path.join("frontend", ".env.development")
    print(f"Creating {fe_env_path}...")
    with open(fe_env_path, "w") as f:
        f.write("VITE_API_URL=http://localhost:8000\n")
    print("frontend/.env.development created.")

if __name__ == "__main__":
    setup()
