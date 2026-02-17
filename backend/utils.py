from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from models import Transaction, PlanLimits, Conversion, DownloadHistory
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

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

def send_email(to_email: str, subject: str, body_html: str):
    """
    Sends an email using SMTP.
    If TESTING env var is set, logs the email instead of sending.
    """
    # Check for TESTING environment variable
    if os.getenv("TESTING") == "True":
        logger.info(f"TESTING MODE: Email suppression active.")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        # logger.info(f"Body: {body_html}") # Uncomment to see full body
        return True

    try:
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")
        smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("MAIL_PORT", "587"))

        if not sender_email or not sender_password:
            logger.warning("Email credentials missing. content not sent.")
            return False

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body_html, 'html'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
