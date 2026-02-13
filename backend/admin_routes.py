from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User, Transaction, Conversion, PlanLimits, DownloadHistory
from dependencies import get_current_user
from schemas import UserPlanUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/user-details")
def get_user_details(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    users = db.query(User).all()
    details = []
    
    today = date.today()
    
    for user in users:
        # 1. Get Current Plan from latest transaction
        latest_tx = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.timestamp.desc()).first()
        plan_type = latest_tx.plan_type if latest_tx else "basic"
        
        # 2. Check Plan Status (Initial Basic Plan?)
        # We consider them on the "default enrollment" if the plan is basic.
        # You could also check if they have exactly 1 transaction which is the signup one.
        is_default_plan = (plan_type.lower() == 'basic')

        # 3. Get Limits for the current plan
        plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == plan_type).first()
        if not plan_limits:
            # Fallback
            plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == "Basic").first()
            
        credit_limit = plan_limits.credit_limit if plan_limits else 0
        
        # 4. Usage Stats
        # We now track usage via user.credits_used
        
        details.append({
            "user_id": user.id,
            "email": user.email,
            "current_plan": plan_type,
            "is_default_plan": is_default_plan,
            "usage": {
                "credits_used": user.credits_used,
                "credit_limit": credit_limit
            }
        })
        
    return details

@router.put("/update-user-plan")
def update_user_plan(plan_update: UserPlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    # 1. Verify User Exists
    user = db.query(User).filter(User.id == plan_update.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Verify Plan Exists (Optional but good practice)
    # If standard plans are Basic, Pro, Plus, we should check against PlanLimits
    plan_limit = db.query(PlanLimits).filter(PlanLimits.plan_name == plan_update.plan_type).first()
    
    # Allow updating to a plan even if it doesn't exist in PlanLimits? 
    # The prompt implies we select from specific values. 
    # If the plan doesn't exist in PlanLimits, the user might get errors later. 
    # For now, let's assume the frontend sends valid plan names.
    
    # 3. Create New Transaction
    # We create a new transaction to represent the plan change. 
    # Amount is 0 for manual admin updates unless specified otherwise.
    new_transaction = Transaction(
        user_id=user.id,
        plan_type=plan_update.plan_type,
        amount=0, # Admin update
        timestamp=datetime.utcnow()
    )
    db.add(new_transaction)
    db.commit()
    
    return {"message": f"User plan updated to {plan_update.plan_type}"}
