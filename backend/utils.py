from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from models import Transaction, PlanLimits, Conversion, DownloadHistory

def check_user_limits(user_id: str, db: Session, text_length: int = 0) -> dict:
    """
    Checks if a user has exceeded their plan limits.
    Returns {'allowed': True/False, 'reason': '...'}
    """
    # 1. Determine User's Plan (Latest Transaction)
    # We assume usage is based on the LATEST transaction. 
    # If no transaction, default to 'Basic'.
    latest_transaction = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc()).first()
    
    current_plan_name = latest_transaction.plan_type if latest_transaction else "Basic"
    
    # 2. Fetch Plan Limits
    plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == current_plan_name).first()
    if not plan_limits:
        # Fallback to Basic if plan not found (e.g. seeding error)
        plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == "Basic").first()
        if not plan_limits:
             # Critical fallback if DB is empty
             return {'allowed': False, 'reason': 'System configuration error: Plan limits not found.'}

    # 3. Check Context Limit (Character count per request)
    if text_length > plan_limits.context_limit:
        return {
            'allowed': False, 
            'reason': f"Text too long for {current_plan_name} plan. Limit is {plan_limits.context_limit} characters."
        }

    # 4. Check Daily Usage (Chats/Conversions per day)
    # Count conversions created *today*
    today = date.today()
    
    # Only check chat limit if tracking a new conversion (text_length > 0 implies generation)
    if text_length > 0:
        daily_chat_count = db.query(Conversion).filter(
            Conversion.user_id == user_id,
            func.date(Conversion.created_at) == today
        ).count()

        if daily_chat_count >= plan_limits.chats_per_day:
            return {
                'allowed': False, 
                'reason': f"Daily conversion limit reached for {current_plan_name} plan. Upgrade to increase limit."
            }
    
    # 5. Check Download Limit (Separate Table)
    # This function is now general. If text_length == 0, we might be checking for download permission.
    # However, download check is best done explicitly in the download route.
    # BUT keeping it here allows checking status easily.
    
    daily_download_count = db.query(DownloadHistory).filter(
        DownloadHistory.user_id == user_id,
        func.date(DownloadHistory.timestamp) == today
    ).count()

    # We return the download count so the caller can decide if they are checking for download or chat
    # Or strict check:
    # If the caller specifies they are doing a download (we'll need a flag), we check this.
    # For now, let's just return the info in the allowed dict or separate function?
    # To keep it simple: We will modify this function to take an action type?
    # Or just return both counts? 
    # Let's keep existing signature and assume text_length > 0 means "Chat Generation".
    # For download checking, we should probably have a separate specific check or just use this 
    # but we need to know if the user is TRYING to download.
    
    # Let's add a helper usage stats to the return if needed, but for now, 
    # we solely focus on "Is this Generate Request allowed?" -> Yes, if Chats < Limit.
    # The previous code checked downloads too which blocked generation. We REMOVE that block here.
    
    # Only block generation if CHAT limit is reached.
    # Download limit will be checked in the download route manually.
    
    return {'allowed': True, 'reason': None, 'plan': plan_limits, 'daily_download_count': daily_download_count}
