from database import SessionLocal, engine
from models import Base, PlanLimits
from sqlalchemy.orm import Session

def seed_plans(db: Session = None):
    """
    Populates the database with default PlanLimits if they don't exist.
    """
    # If run as standalone, create a session
    standalone = False
    if db is None:
        db = SessionLocal()
        standalone = True
        
    # Ensure table exists (safe to call even if exists)
    Base.metadata.create_all(bind=engine)

    plans_data = [
        {"plan_name": "Basic", "chats_per_day": 5, "context_limit": 500, "download_limit": 2, "history_days": 7},
        {"plan_name": "Pro", "chats_per_day": 50, "context_limit": 2000, "download_limit": 20, "history_days": 30},
        {"plan_name": "Plus", "chats_per_day": 9999, "context_limit": 9999, "download_limit": 9999, "history_days": 9999},
    ]

    try:
        print("Checking Plan Limits...")
        for data in plans_data:
            existing_plan = db.query(PlanLimits).filter(PlanLimits.plan_name == data["plan_name"]).first()
            
            if not existing_plan:
                print(f"Adding new plan: {data['plan_name']}")
                new_plan = PlanLimits(**data)
                db.add(new_plan)
            else:
                # Update existing plan values (optional, but good for keeping in sync)
                updated = False
                for key, value in data.items():
                    if getattr(existing_plan, key) != value:
                        setattr(existing_plan, key, value)
                        updated = True
                if updated:
                    print(f"Updated plan: {data['plan_name']}")
                else:
                    print(f"Plan safe: {data['plan_name']}")

        db.commit()
        print("Plan seeding complete.")

    except Exception as e:
        print(f"Error seeding plans: {e}")
        db.rollback()
    finally:
        if standalone:
            db.close()

if __name__ == "__main__":
    seed_plans()
