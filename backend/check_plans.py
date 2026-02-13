from database import SessionLocal
from models import PlanLimits

def check_plans():
    db = SessionLocal()
    plans = db.query(PlanLimits).all()
    for p in plans:
        print(f"Plan: {p.plan_name}, Credit Limit: {p.credit_limit}, History Days: {p.history_days}")
    db.close()

if __name__ == "__main__":
    check_plans()
