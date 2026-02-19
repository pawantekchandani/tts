
import logging
from sqlalchemy import text
from database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    """
    Updates the database schema to include new columns.
    """
    logger.info("Starting schema update...")
    
    try:
        with engine.connect() as connection:
            # 1. Add style_degree column to conversions table
            logger.info("Checking for 'style_degree' column in 'conversions' table...")
            try:
                # Check if column exists
                check_query = text("SHOW COLUMNS FROM conversions LIKE 'style_degree'")
                result = connection.execute(check_query).fetchone()
                
                if not result:
                    logger.info("Column 'style_degree' not found. Adding it now...")
                    alter_query = text("ALTER TABLE conversions ADD COLUMN style_degree FLOAT DEFAULT 1.0")
                    connection.execute(alter_query)
                    logger.info("Column 'style_degree' added successfully.")
                else:
                    logger.info("Column 'style_degree' already exists.")
                    
            except Exception as e:
                logger.error(f"Error checking/adding column: {e}")
                
            connection.commit()
            logger.info("Schema update completed successfully.")
            
    except Exception as e:
        logger.critical(f"Schema update failed: {e}")

if __name__ == "__main__":
    update_schema()
