from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from models import Transaction, PlanLimits, Conversion, DownloadHistory

def check_user_limits(user_id: str, db: Session, text_length: int = 0) -> dict:
    """
    Checks if a user has sufficient credits.
    Returns {'allowed': True/False, 'reason': '...'}
    """
    from models import User # Avoid circular import if any
    
    # 1. Determine User's Plan (Latest Transaction)
    latest_transaction = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc()).first()
    current_plan_name = latest_transaction.plan_type if latest_transaction else "Basic"
    
    # 2. Fetch Plan Limits
    plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == current_plan_name).first()
    if not plan_limits:
        # Fallback
        plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == "Basic").first()
        if not plan_limits:
             return {'allowed': False, 'reason': 'System configuration error: Plan limits not found.'}

    # 3. Fetch User Credits Used
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {'allowed': False, 'reason': 'User not found.'}
    
    # 4. Check Credits
    # If text_length > 0, we assume it's a conversion request which costs 1 credit per character.
    cost = text_length
    
    if user.credits_used + cost > plan_limits.credit_limit:
        return {
            'allowed': False, 
            'reason': f"Credit limit reached for {current_plan_name} plan ({user.credits_used}/{plan_limits.credit_limit}). Upgrade for more credits."
        }
    
    return {'allowed': True, 'reason': None, 'plan': plan_limits, 'current_usage': user.credits_used}


def smart_split(text, limit=3000):
    chunks = []
    while len(text) > limit:
        # Find the last sentence ending punctuation within the limit
        split_indices = [text.rfind(p, 0, limit) for p in [".", "!", "?"]]
        last_punc = max(split_indices)
        
        if last_punc != -1:
            split_point = last_punc + 1  # Include the punctuation
        else:
            # Fallback to last space
            last_space = text.rfind(" ", 0, limit)
            if last_space != -1:
                split_point = last_space
            else:
                # Force bad split
                split_point = limit
        
        chunks.append(text[:split_point].strip())
        text = text[split_point:].strip()
    
    if text:
        chunks.append(text.strip())
    
    return chunks
