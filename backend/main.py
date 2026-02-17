import os
import sys

if os.name != 'nt':
    # 1. FORCE SYSTEM PATHS AT THE OS LEVEL (Linux/Server only)
    os.environ["PATH"] += os.pathsep + "/home/rseivuhw/bin"

from pydub import AudioSegment
# Set specific paths as backup for Linux
if os.name != 'nt':
    AudioSegment.converter = "/home/rseivuhw/bin/ffmpeg"
    AudioSegment.ffprobe = "/home/rseivuhw/bin/ffprobe"

# 2. DEBUG PRINT TO VERIFY
print(f"DEBUG: Current OS PATH: {os.environ['PATH']}")

# 3. NOW LOAD THE REST OF THE APP
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

import sentry_sdk
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Conversion, PasswordReset, Transaction, PlanLimits, DownloadHistory
from schemas import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest, PlanLimitUpdate, UserProfile
from auth import hash_password, verify_password, create_access_token, generate_user_id
# import azure.cognitiveservices.speech as speechsdk  <-- REMOVED TO FIX GLIBC ERROR
# Azure Speech SDK NOT used directly to support older Linux versions
import uuid
from fastapi.staticfiles import StaticFiles
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
import io
import traceback

# --- AUTO MIGRATION ---
# --- AUTO MIGRATION ---
from auto_migrate import run_auto_migrations
from utils import check_user_limits, smart_split, send_email
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
        logging.FileHandler("app_errors.log", encoding='utf-8'), # ADD ENCODING HERE
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)



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

# Azure Speech Config initialization removed (REST API used)

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

        # 1. Create User
        try:
            db_user = User(id=new_id, email=user.email, hashed_password=hashed_password)
            db.add(db_user)
            db.flush() # Verify user creation before transaction
        except Exception as e:
             logger.error(f"Error creating user in DB: {str(e)}")
             raise HTTPException(status_code=500, detail=f"Database Error (User Creation): {str(e)}")

        # 2. Create Transaction
        try:
            new_transaction = Transaction(
                user_id=new_id,
                plan_type='basic',
                amount=0,
                timestamp=datetime.utcnow()
            )
            db.add(new_transaction)
            db.flush() # Verify transaction creation
        except Exception as e:
             logger.error(f"Error creating transaction: {str(e)}")
             # This often happens if 'transactions' table is missing
             raise HTTPException(status_code=500, detail=f"Database Error (Transaction Creation): {str(e)}")

        # 3. Commit Everything
        try:
            db.commit()
            db.refresh(db_user)
        except Exception as e:
             logger.error(f"Error committing signup: {str(e)}")
             db.rollback()
             raise HTTPException(status_code=500, detail=f"Database Commit Error: {str(e)}")

        # --- Send Welcome Email ---
        try:
            subject = "Welcome to Pollyglot - Successfully Registered!"
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
            send_email(user.email, subject, body)

        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")

        return db_user
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Signup Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Email is not registered")
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
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
    
    # Get plan limits
    plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == plan_type).first()
    if not plan_limits:
        plan_limits = db.query(PlanLimits).filter(PlanLimits.plan_name == "Basic").first()
    
    credit_limit = plan_limits.credit_limit if plan_limits else 0

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        is_admin=current_user.is_admin,
        plan_type=plan_type,
        credits_used=current_user.credits_used or 0,
        credit_limit=credit_limit,
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
        origin = req.headers.get("origin") or "http://localhost:3000"
        reset_link = f"{origin}/reset-password?token={token}"

        subject = "Password Reset Request"
        body = f"""<a href="{reset_link}">Click here to reset password</a>"""
        
        send_email(request.email, subject, body)
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
        
    plan.credit_limit = plan_update.credit_limit
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
    
    # Azure Speech Config check removed (using REST API now)

    # Check Plan Limits
    chars = len(conversion.text)
    limit_check = check_user_limits(current_user.id, db, chars)
    if not limit_check['allowed']:
        raise HTTPException(status_code=403, detail=limit_check['reason'])

    try:
        # --- REST API IMPLEMENTATION (GLIBC SAFE) ---
        import requests

        speech_key = os.getenv("AZURE_SPEECH_KEY")
        service_region = os.getenv("AZURE_SPEECH_REGION")
        
        if not speech_key or not service_region:
             raise HTTPException(status_code=500, detail="Azure Configuration Error")

        # 1. Get Access Token
        token_url = f"https://{service_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        headers = {
            "Ocp-Apim-Subscription-Key": speech_key
        }
        try:
            token_response = requests.post(token_url, headers=headers)
            token_response.raise_for_status()
            access_token = token_response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get Azure Token: {e}")
            raise HTTPException(status_code=500, detail="Text-to-Speech Service Unavailable")

        # 2. Define Helper for TTS Request
        def text_to_speech_rest(text_chunk, voice_name_param, output_file):
            tts_url = f"https://{service_region}.tts.speech.microsoft.com/cognitiveservices/v1"
            
            # Construct SSML
            ssml = f"""
            <speak version='1.0' xml:lang='en-US'>
                <voice xml:lang='en-US' xml:gender='Female' name='{voice_name_param}'>
                    {text_chunk}
                </voice>
            </speak>
            """
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                "User-Agent": "PollyGlot"
            }
            
            response = requests.post(tts_url, headers=headers, data=ssml.encode('utf-8'))
            
            if response.status_code == 200:
                with open(output_file, 'wb') as audio:
                    audio.write(response.content)
                return True
            else:
                logger.error(f"TTS REST Error {response.status_code}: {response.text}")
                if response.status_code == 429:
                     raise HTTPException(status_code=429, detail="Service limit reached. Try again later.")
                return False

        # Determine output path
        voice_name = conversion.voice_id or "en-US-JennyNeural"
        now = datetime.now()
        month_year = now.strftime("%B-%Y")
        user_folder = str(current_user.id)
        audio_base_path = static_path / "audio" / month_year / user_folder
        audio_base_path.mkdir(parents=True, exist_ok=True)
        filename = now.strftime("%b-%d_%H-%M-%S") + ".mp3"
        file_path = audio_base_path / filename

        # --- SMART SPLIT & MERGE ---
        if len(conversion.text) > 3000:
            chunks = smart_split(conversion.text)
            logger.info(f"Text too long, split into {len(chunks)} chunks.")
            
            combined_audio = AudioSegment.empty()
            
            for i, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue
                
                temp_filename = f"temp_{current_user.id}_{i}_{now.timestamp()}.mp3"
                temp_path = audio_base_path / temp_filename
                
                # CALL REST API
                success = text_to_speech_rest(chunk, voice_name, str(temp_path))
                
                if success:
                    try:
                        chunk_audio = AudioSegment.from_file(str(temp_path), format="mp3")
                        combined_audio += chunk_audio
                        logger.info(f"Processed chunk {i+1}/{len(chunks)}")
                    except Exception as e:
                         logger.error(f"Error merging chunk: {e}")
                    finally:
                        if temp_path.exists():
                            try:
                                os.remove(temp_path)
                            except:
                                pass
                else:
                    raise Exception("Failed to convert chunk via API")

            combined_audio.export(str(file_path), format="mp3")
            
        else:
            # --- SINGLE CALL ---
            success = text_to_speech_rest(conversion.text, voice_name, str(file_path))
            if success:
                logger.info(f"Conversion successful. Audio saved at: {file_path}")
            else:
                 raise HTTPException(status_code=500, detail="Failed to generate audio")
            
        audio_url = f"/static/audio/{month_year}/{user_folder}/{filename}"
        
        db_conversion = Conversion(
            text=conversion.text, audio_url=audio_url, 
            voice_name=voice_name, user_id=current_user.id, created_at=now
        )
        db.add(db_conversion)
        
        # Increment Credits
        current_user.credits_used = (current_user.credits_used or 0) + chars
        
        db.commit()
        db.refresh(db_conversion)
        
        return ConversionOut(
            id=db_conversion.id, text=db_conversion.text, voice_name=db_conversion.voice_name,
            audio_url=audio_url, created_at=db_conversion.created_at.isoformat()
        )
    except HTTPException as e:
         raise e
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Conversion Error: {e}\nTraceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

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

    # 3. Record Download
    # Note: Download limits have been removed, but we still log history.
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
    
    # 4. Serve File
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
        )# Update
