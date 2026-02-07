import mysql.connector
from prettytable import PrettyTable

def show_db_structure():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Deepak@123",
            database="tts_local_db"
        )
        cursor = conn.cursor()

        # Get all tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()

        if not tables:
            print("No tables found in tts_local_db.")
            return

        print(f"\n📂 Database: tts_local_db\n{'='*30}")

        for (table_name,) in tables:
            print(f"\n📋 Table: {table_name}")
            t = PrettyTable(['Column', 'Type', 'Null', 'Key', 'Default', 'Extra'])
            
            cursor.execute(f"DESCRIBE {table_name}")
            columns = cursor.fetchall()
            
            for col in columns:
                t.add_row(col)
            print(t)
            
            # Show row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"   --> Total Rows: {count}")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    show_db_structure()
