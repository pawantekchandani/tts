import sentry_sdk
import logging
import sys
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Conversion, PasswordReset, Transaction, PlanLimits, DownloadHistory
from schemas import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest, PlanLimitUpdate, UserProfile
from auth import hash_password, verify_password, create_access_token, generate_user_id
import boto3
import os
from dotenv import load_dotenv
import uuid
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from schemas import ConversionCreate, ConversionOut
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy import func
from fastapi.security import OAuth2PasswordBearer
from auth import verify_token
# --- AUTO MIGRATION ---
from auto_migrate import run_auto_migrations
from utils import check_user_limits
from dependencies import get_current_user
import admin_routes

# --- 1. SENTRY CONFIGURATION ---
sentry_sdk.init(
    dsn="https://802e0792557423aef70c6a49dfe32404@o4510838171107328.ingest.us.sentry.io/4510838173925376",
    traces_sample_rate=1.0,
    send_default_pii=True
)

# --- 2. LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app_errors.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load .env file
load_dotenv(Path(__file__).parent / ".env")

app = FastAPI()

app.include_router(admin_routes.router)

# Handle DB Migrations (Existing Schema Changes)
# Handle DB Migrations (Existing Schema Changes)
run_auto_migrations()

# Create NEW Tables (if they don't exist)
Base.metadata.create_all(bind=engine)

# Seed Plan Limits
from seed_plans import seed_plans
seed_plans()


# --- 3. GLOBAL ERROR CATCHER ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"CRITICAL ERROR in {request.url.path}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error. Please check logs/Sentry."}
        )

# AWS Polly Client Configuration
try:
    polly_client = boto3.client(
        'polly',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )
    logger.info("AWS Polly Client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize AWS Polly client: {e}")
    polly_client = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_msg = errors[0].get('msg', 'Validation error') if errors else "Validation error"
    logger.warning(f"Validation Error on {request.url.path}: {error_msg}")
    return JSONResponse(status_code=400, content={"detail": error_msg})


# --- AUTH DEPENDENCIES ---
# Moved to dependencies.py

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Server is running"}

# --- AUTH ROUTES ---

@app.post("/api/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = hash_password(user.password)
        
        for _ in range(5):
             new_id = generate_user_id()
             if not db.query(User).filter(User.id == new_id).first():
                 break
        else:
             raise HTTPException(status_code=500, detail="Could not generate unique User ID")

        db_user = User(id=new_id, email=user.email, hashed_password=hashed_password)
        db.add(db_user)
        db.flush()

        # Create default transaction for the new user
        new_transaction = Transaction(
            user_id=new_id,
            plan_type='basic',
            amount=0,
            timestamp=datetime.utcnow()
        )
        db.add(new_transaction)

        db.commit()
        db.refresh(db_user)

        # --- Send Welcome Email ---
        try:
            sender_email = os.getenv("MAIL_USERNAME")
            sender_password = os.getenv("MAIL_PASSWORD")
            smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
            smtp_port = int(os.getenv("MAIL_PORT", "587"))

            if sender_email and sender_password:
                msg = MIMEMultipart()
                msg['From'] = sender_email
                msg['To'] = user.email
                msg['Subject'] = "Welcome to Pollyglot - Successfully Registered!"

                body = f"""
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #ea580c;">Welcome to Pollyglot! 🎧</h2>
                    <p>Hi there,</p>
                    <p>Thank you for joining <b>Pollyglot</b>! Your account has been successfully created.</p>
                    <p>You can now log in and start converting text to lifelike speech instantly.</p>
                    <div style="margin: 20px 0;">
                        <a href="http://localhost:5173/login" style="background-color: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a>
                    </div>
                    <p>If you have any questions, feel free to rely to this email.</p>
                    <br>
                    <p>Best Regards,</p>
                    <p><b>The Pollyglot Team</b></p>
                </div>
                """
                msg.attach(MIMEText(body, 'html'))

                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
                server.quit()
        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")

        return db_user
    except Exception as e:
        logger.error(f"Signup Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    # Get user plan
    latest_tx = db.query(Transaction).filter(Transaction.user_id == db_user.id).order_by(Transaction.timestamp.desc()).first()
    plan_type = latest_tx.plan_type if latest_tx else "Basic"
    
    return {"access_token": access_token, "token_type": "bearer", "plan_type": plan_type}

@app.get("/api/me", response_model=UserProfile)
def get_current_user_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get user plan from latest transaction
    latest_tx = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.timestamp.desc()).first()
    plan_type = latest_tx.plan_type if latest_tx else "Basic"
    
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        is_admin=current_user.is_admin,
        plan_type=plan_type,
        member_since=current_user.created_at.isoformat() if current_user.created_at else None
    )

@app.post("/api/forgot-password")
def forgot_password(request: ForgotPasswordRequest, req: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        return {"message": "If email exists, a reset link has been sent"}
    
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=1)
    password_reset = PasswordReset(email=request.email, token=token, expires_at=expires_at)
    db.add(password_reset)
    db.commit()

    try:
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")
        smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("MAIL_PORT", "587"))

        origin = req.headers.get("origin") or "http://localhost:3000"
        reset_link = f"{origin}/reset-password?token={token}"

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = request.email
        msg['Subject'] = "Password Reset Request"

        body = f"""<a href="{reset_link}">Click here to reset password</a>"""
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return {"message": "Reset link sent"}
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        return {"message": "Error sending email"}

@app.post("/api/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(PasswordReset).filter(PasswordReset.token == request.token).first()
    if not reset_entry or reset_entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.email == reset_entry.email).first()
    if user:
        user.hashed_password = hash_password(request.new_password)
        db.delete(reset_entry)
        db.commit()
    return {"message": "Password updated successfully"}

# --- ADMIN ROUTES ---

@app.get("/api/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")

    # 2. Total Users Count
    total_users = db.query(User).count()

    # 3. Total Earnings (Sum of all transactions)
    total_earnings_result = db.query(func.sum(Transaction.amount)).scalar()
    total_earnings = total_earnings_result if total_earnings_result else 0.0

    # 4. User Plan Breakdown
    plan_counts = db.query(Transaction.plan_type, func.count(Transaction.plan_type))\
        .group_by(Transaction.plan_type).all()
    user_plan_breakdown = {plan: count for plan, count in plan_counts}

    # 5. Recent Activity
    recent_activity = db.query(Conversion).order_by(Conversion.created_at.desc()).limit(5).all()
    
    activity_data = []
    for item in recent_activity:
        user = db.query(User).filter(User.id == item.user_id).first()
        activity_data.append({
            "id": item.id,
            "user": user.email if user else "Unknown",
            "action": "Conversion",
            "details": f"Generated audio: {item.text[:20]}...",
            "date": item.created_at.isoformat()
        })

    return {
        "totalUsers": total_users,
        "totalEarnings": total_earnings,
        "userPlanBreakdown": user_plan_breakdown,
        "recentActivity": activity_data
    }

@app.get("/api/admin/plans")
def get_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    return db.query(PlanLimits).all()

@app.put("/api/admin/plans/{plan_name}")
def update_plan(plan_name: str, plan_update: PlanLimitUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
         raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    plan = db.query(PlanLimits).filter(PlanLimits.plan_name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    plan.chats_per_day = plan_update.chats_per_day
    plan.context_limit = plan_update.context_limit
    plan.download_limit = plan_update.download_limit
    plan.history_days = plan_update.history_days
    
    db.commit()
    db.refresh(plan)
    return plan


# --- CONTENT ROUTES ---

static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)

@app.post("/api/convert", response_model=ConversionOut)
def convert_text(conversion: ConversionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not conversion.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if not polly_client:
         raise HTTPException(status_code=500, detail="AWS Polly unavailable")

    # Check Plan Limits
    limit_check = check_user_limits(current_user.id, db, len(conversion.text))
    if not limit_check['allowed']:
        raise HTTPException(status_code=403, detail=limit_check['reason'])

    try:
        response = polly_client.synthesize_speech(
            Text=conversion.text,
            OutputFormat='mp3',
            VoiceId=conversion.voice_id or 'Joanna',
            Engine=conversion.engine
        )
        
        now = datetime.now()
        month_year = now.strftime("%B-%Y")
        user_folder = str(current_user.id)
        audio_base_path = static_path / "audio" / month_year / user_folder
        audio_base_path.mkdir(parents=True, exist_ok=True)
        
        filename = now.strftime("%b-%d_%H-%M-%S") + ".mp3"
        file_path = audio_base_path / filename
        
        with open(file_path, 'wb') as f:
            f.write(response['AudioStream'].read())
            
        audio_url = f"/static/audio/{month_year}/{user_folder}/{filename}"
        
        db_conversion = Conversion(
            text=conversion.text, audio_url=audio_url, 
            voice_name=conversion.voice_id, user_id=current_user.id, created_at=now
        )
        db.add(db_conversion)
        db.commit()
        db.refresh(db_conversion)
        
        return ConversionOut(
            id=db_conversion.id, text=db_conversion.text, voice_name=db_conversion.voice_name,
            audio_url=audio_url, created_at=db_conversion.created_at.isoformat()
        )
    except Exception as e:
        logger.error(f"Conversion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=list[ConversionOut])
def get_history(
    page: int = 1, limit: int = 10, search: Optional[str] = None, date: Optional[str] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # 1. Determine User's Plan & History Limit
    latest_transaction = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.timestamp.desc()).first()
    current_plan_name = latest_transaction.plan_type if latest_transaction else "Basic"
    
    plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == current_plan_name).first()
    history_days = plan_limits.history_days if plan_limits else 7 # Default to 7 days if something goes wrong
    
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=history_days)

    offset_val = (page - 1) * limit
    
    # 2. Build Query with Time Limit
    query = db.query(Conversion).filter(
        Conversion.user_id == current_user.id,
        Conversion.created_at >= cutoff_date 
    )
    
    if search:
        query = query.filter(Conversion.text.contains(search))
    if date:
        query = query.filter(func.date(Conversion.created_at) == date)
        
    conversions = query.order_by(Conversion.created_at.desc()).offset(offset_val).limit(limit).all()
    
    results = []
    for c in conversions:
        results.append(ConversionOut(
            id=c.id, text=c.text, voice_name=c.voice_name or "Unknown",
            audio_url=c.audio_url, 
            created_at=c.created_at.isoformat() if c.created_at else datetime.now().isoformat()
        ))
    return results


@app.post("/api/history", response_model=ConversionOut)
def save_history(conversion: ConversionCreate, audio_url: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        now = datetime.now()
        db_conversion = Conversion(
            text=conversion.text,
            audio_url=audio_url,
            voice_name=conversion.voice_id,
            user_id=current_user.id,
            created_at=now
        )
        db.add(db_conversion)
        db.commit()
        db.refresh(db_conversion)
        return ConversionOut(
            id=db_conversion.id,
            text=db_conversion.text,
            voice_name=db_conversion.voice_name,
            audio_url=db_conversion.audio_url,
            created_at=db_conversion.created_at.isoformat()
        )
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
        raise HTTPException(status_code=500, detail="Failed to save history")


# --- STATIC & FRONTEND SERVING ---

@app.get("/static/audio/{file_path:path}")
def get_audio_file(file_path: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    requested_url = f"/static/audio/{file_path}"
    
    # Security check
    conversion = db.query(Conversion).filter(Conversion.audio_url == requested_url).first()
    
    if not conversion:
        logger.warning(f"Access denied: No record found for {requested_url}")
        raise HTTPException(status_code=404, detail="File record not found")
        
    if conversion.user_id != current_user.id:
        logger.warning(f"Unauthorized access by user {current_user.id}")
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this file")
        
    full_path = static_path / "audio" / file_path
    
    if not full_path.exists() or not full_path.is_file():
         raise HTTPException(status_code=404, detail="File not found on server")
         
    return FileResponse(full_path)

@app.get("/api/download/{conversion_id}")
def download_conversion(conversion_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch Conversion Record
    conversion = db.query(Conversion).filter(Conversion.id == conversion_id).first()
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
        
    # 2. Check Ownership
    if conversion.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this file")

    # 3. Check Download Limit
    usage_check = check_user_limits(current_user.id, db, text_length=0) # 0 means we act like we are just checking usage
    if not usage_check['allowed']:
        # This only happens if plan is missing/error
         raise HTTPException(status_code=500, detail=usage_check['reason'])

    current_plan = usage_check.get('plan')
    daily_downloads = usage_check.get('daily_download_count', 0)
    
    if current_plan and daily_downloads >= current_plan.download_limit:
        raise HTTPException(status_code=403, detail=f"Daily download limit reached ({current_plan.download_limit}). Upgrade to download more.")

    # 4. Record Download (If allowed)
    try:
        new_download = DownloadHistory(
            user_id=current_user.id,
            conversion_id=conversion.id,
            timestamp=datetime.utcnow()
        )
        db.add(new_download)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log download history: {e}")
        # We proceed even if logging fails? Or block? Better to fail safe.
        # But for user experience, maybe just log error.
    
    # 5. Serve File
    # Extract file path from URL logic (since we stored full URL previously)
    # URL format: /static/audio/Month-Year/UserId/Filename.mp3
    # We need just the relative path: Month-Year/UserId/Filename.mp3
    try:
        relative_path = conversion.audio_url.replace("/static/audio/", "")
        full_path = static_path / "audio" / relative_path
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="Audio file missing from server storage.")

        return FileResponse(
            full_path, 
            headers={"Content-Disposition": f"attachment; filename={full_path.name}"},
            media_type="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"Download Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during download.")

app.mount("/static", StaticFiles(directory=static_path), name="static")


# ==========================================
# 🚀 FINAL FRONTEND FIX (ENV VARIABLE SUPPORT)
# ==========================================

# 1. Get Path from Environment Variable (Best Practice)
FRONTEND_PATH = os.getenv("FRONTEND_PATH")

if not FRONTEND_PATH:
    logger.warning("FRONTEND_PATH not found in .env file! Frontend may not load.")
    FRONTEND_PATH = None

# 2. Serve Files if Path Exists
if FRONTEND_PATH and os.path.exists(FRONTEND_PATH):
    logger.info(f"SERVING FRONTEND FROM: {FRONTEND_PATH}")

    # Mount Assets (CSS/JS)
    assets_dir = os.path.join(FRONTEND_PATH, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve Index.html at Root
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))

    # Catch-All for React Router (SPA Support)
    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        if request.url.path.startswith("/api") or request.url.path.startswith("/static"):
             return JSONResponse({"detail": "Not Found"}, status_code=404)
        
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))

else:
    # Fallback if frontend is missing or path is wrong
    @app.get("/")
    def frontend_missing():
        return HTMLResponse(
            "<h1>Frontend Files Not Found</h1>"
            "<p>Please check if <b>FRONTEND_PATH</b> is set correctly in your <b>.env</b> file.</p>", 
            status_code=404
        )