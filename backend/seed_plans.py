from sqlalchemy.orm import Session
from database import SessionLocal
from models import PlanLimits
import logging

logger = logging.getLogger(__name__)

def seed_plans(db: Session = None):
    """
    Seeds the database with default plan limits if they do not exist.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
        
    try:
        # Define default plans
        plans = [
            {"plan_name": "Free", "credit_limit": 1000, "history_days": 7},
            {"plan_name": "Basic", "credit_limit": 3000, "history_days": 7},
            {"plan_name": "Pro", "credit_limit": 10000, "history_days": 30},
            {"plan_name": "Plus", "credit_limit": 50000, "history_days": 90}
        ]

        for plan_data in plans:
            existing_plan = db.query(PlanLimits).filter(PlanLimits.plan_name == plan_data["plan_name"]).first()
            if not existing_plan:
                new_plan = PlanLimits(**plan_data)
                db.add(new_plan)
                logger.info(f"Seeded plan: {plan_data['plan_name']}")
            else:
                # Optional: Update existing plan limits if they changed
                pass
        
        db.commit()
    except Exception as e:
        logger.error(f"Failed to seed plans: {e}")
        db.rollback()
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_plans()
