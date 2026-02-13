
from database import SessionLocal
from models import User, PlanLimits, Transaction
from datetime import datetime

# User email from trigger_error.py
email = "test_script_user@example.com"

db = SessionLocal()
user = db.query(User).filter(User.email == email).first()

if user:
    print(f"User found: {user.email}")
    # Reset credits used
    user.credits_used = 0
    
    # Create a transaction to upgrade plan to 'Pro' (assuming 'Pro' has higher limits)
    # Check if Pro plan exists
    pro_plan = db.query(PlanLimits).filter(PlanLimits.plan_name == "Pro").first()
    if not pro_plan:
        print("Creating Pro plan...")
        pro_plan = PlanLimits(plan_name="Pro", credit_limit=100000, history_days=30, request_limit=50)
        db.add(pro_plan)
        db.commit()
    
    print("Upgrading user to Pro...")
    tx = Transaction(
        user_id=user.id,
        plan_type="Pro",
        amount=29.99,
        timestamp=datetime.utcnow()
    )
    db.add(tx)
    db.commit()
    print("User upgraded and credits reset.")
else:
    print("User not found (run trigger_error.py first to create it).")

db.close()
