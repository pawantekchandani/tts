from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Transaction
from schemas import Token
from auth import create_access_token, generate_user_id
from datetime import datetime
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import logging
import os
import secrets

logger = logging.getLogger(__name__)

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/auth/google", response_model=Token)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured in environment")
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
        
    try:
        # The frontend provides an 'access_token' via the useGoogleLogin hook (implicit flow).
        # To verify it, we hit the generic Google userinfo endpoint.
        import requests
        
        headers = {
            "Authorization": f"Bearer {request.token}"
        }
        resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers=headers)
        
        if resp.status_code != 200:
            raise ValueError(f"Google responded with {resp.status_code}: {resp.text}")
            
        idinfo = resp.json()
        
        email = idinfo.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Google token did not provide an email")
            
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        plan_type = "Basic"
        if not user:
            # Create a new user
            for _ in range(5):
                 new_id = generate_user_id()
                 if not db.query(User).filter(User.id == new_id).first():
                     break
            else:
                 raise HTTPException(status_code=500, detail="Could not generate unique User ID")
            
            # Placeholder password since they authenticate via Google
            placeholder_pwd = secrets.token_urlsafe(32)
            
            db_user = User(
                id=new_id, 
                email=email, 
                hashed_password=f"GOOGLE_AUTH_{placeholder_pwd}",
                credits_used=-47000  # -47000 + 3000 (Basic plan limit) = 50,000 starting credits
            )
            db.add(db_user)
            db.flush()
            
            # We can use the Basic plan and set credits_used negative to reach 50,000 credits,
            # or assign a plan like "Plus" that has a 50,000 limit. 
            # We assign "Plus" directly as it explicitly provides a 50,000 limit according to seed_plans.py
            plan_type = "Plus"
            new_transaction = Transaction(
                user_id=new_id,
                plan_type=plan_type,
                amount=0,
                timestamp=datetime.utcnow()
            )
            db.add(new_transaction)
            
            # Ensure credits_used is 0 if we rely on the Plus plan limit of 50k
            db_user.credits_used = 0
            
            db.commit()
            db.refresh(db_user)
            user = db_user
            logger.info(f"Created new Google Auth user: {email} with starting plan: {plan_type}")
        else:
            # Existing user, determine their plan
            latest_tx = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.timestamp.desc()).first()
            if latest_tx:
                plan_type = latest_tx.plan_type
            logger.info(f"Existing Google Auth user logged in: {email}")
            
        # Return JWT Token
        access_token = create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "plan_type": plan_type
        }
        
    except ValueError as e:
        # Invalid token
        logger.error(f"Google Token Verification Error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token")
    except Exception as e:
        logger.error(f"Google Auth unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error during Google Authentication")
