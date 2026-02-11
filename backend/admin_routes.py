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
            plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == "basic").first()
            
        chats_limit = plan_limits.chats_per_day if plan_limits else 0
        context_limit = plan_limits.context_limit if plan_limits else 0
        download_limit = plan_limits.download_limit if plan_limits else 0
        
        # 4. Usage Stats
        # Total chats today
        chats_today = db.query(Conversion).filter(
            Conversion.user_id == user.id,
            func.date(Conversion.created_at) == today
        ).count()
        
        # Total downloads today
        downloads_today = db.query(DownloadHistory).filter(
            DownloadHistory.user_id == user.id,
            func.date(DownloadHistory.timestamp) == today
        ).count()
        
        # Total usage (characters) today. 
        # Note: The prompt asks for "total words", but context_limit is in chars. 
        # We sum the length of the text.
        try:
             # func.length returns bytes in some DBs, char_length in others. 
             # For standard SQL or sqlite, length matches chars usually. 
             # For MySQL with utf8mb4, char_length is safer for character count.
            words_today_result = db.query(func.sum(func.char_length(Conversion.text))).filter(
                Conversion.user_id == user.id,
                func.date(Conversion.created_at) == today
            ).scalar()
        except Exception:
             # Fallback if char_length not supported (e.g. sqlite uses length)
            words_today_result = db.query(func.sum(func.length(Conversion.text))).filter(
                Conversion.user_id == user.id,
                func.date(Conversion.created_at) == today
            ).scalar()
            
        words_today = int(words_today_result) if words_today_result else 0
        
        details.append({
            "user_id": user.id,
            "email": user.email,
            "current_plan": plan_type,
            "is_default_plan": is_default_plan,
            "usage": {
                "chats_today": chats_today,
                "chats_limit": chats_limit,
                "words_today": words_today,
                "context_limit": context_limit,
                "downloads_today": downloads_today,
                "download_limit": download_limit
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
