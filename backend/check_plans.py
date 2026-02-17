from database import SessionLocal
from models import PlanLimits

def check_plans(db=None):
    if db is None:
        db = SessionLocal()
        close_db = True
    else:
        close_db = False
        
    try:
        plans = db.query(PlanLimits).all()
        for p in plans:
            print(f"Plan: {p.plan_name}, Credit Limit: {p.credit_limit}, History Days: {p.history_days}")
        return plans
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    check_plans()
