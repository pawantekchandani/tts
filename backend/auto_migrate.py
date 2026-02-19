import logging
from database import engine, Base
# Import all models to ensure they are registered with Base.metadata
import models 

# Configure logging
logger = logging.getLogger(__name__)

def run_auto_migrations():
    """
    Automatically creates database tables based on SQLAlchemy models.
    """
    logger.info("Starting auto-migration process...")
    try:
        # The create_all method creates tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Auto-migration completed successfully: Database tables verified/created.")
    except Exception as e:
        logger.critical(f"Auto-migration failed: {e}")
        raise e

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_auto_migrations()
