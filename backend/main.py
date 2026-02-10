import sentry_sdk
import logging
import sys
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Conversion, PasswordReset
from schemas import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest
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

load_dotenv(Path(__file__).parent / ".env")

app = FastAPI()

# Create Database Tables
Base.metadata.create_all(bind=engine)

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id_str).first()
    if user is None:
        raise credentials_exception
        
    return user

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
        db.commit()
        db.refresh(db_user)
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
    return {"access_token": access_token, "token_type": "bearer"}

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

# --- CONTENT ROUTES ---

static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)

@app.post("/api/convert", response_model=ConversionOut)
def convert_text(conversion: ConversionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not conversion.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if not polly_client:
         raise HTTPException(status_code=500, detail="AWS Polly unavailable")

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
    offset_val = (page - 1) * limit
    query = db.query(Conversion).filter(Conversion.user_id == current_user.id)
    
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

# --- THIS WAS MISSING IN PREVIOUS VERSION (Restored) ---
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
    
    # Security check (Restored from your old code)
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

app.mount("/static", StaticFiles(directory=static_path), name="static")


# ==========================================
# 🚀 FINAL FRONTEND FIX (NO GUESSING)
# ==========================================

# Direct paths based on your diagnosis
SERVER_FRONTEND_PATH = "/home/rseivuhw/tts.testingprojects.online"
LOCAL_FRONTEND_PATH = "../frontend/dist"

FRONTEND_PATH = None

# Check where we are running
if os.path.exists(SERVER_FRONTEND_PATH):
    FRONTEND_PATH = SERVER_FRONTEND_PATH
    logger.info(f"SERVING FRONTEND FROM SERVER: {FRONTEND_PATH}")
elif os.path.exists(LOCAL_FRONTEND_PATH):
    FRONTEND_PATH = LOCAL_FRONTEND_PATH
    logger.info(f"SERVING FRONTEND FROM LOCAL: {FRONTEND_PATH}")
else:
    logger.warning("NO FRONTEND FOUND! Website will not load.")

if FRONTEND_PATH:
    # 1. Mount Assets (CSS/JS)
    assets_dir = os.path.join(FRONTEND_PATH, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # 2. Serve Index.html at Root
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))

    # 3. Catch-All for React Router (SPA Support)
    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        if request.url.path.startswith("/api") or request.url.path.startswith("/static"):
             return JSONResponse({"detail": "Not Found"}, status_code=404)
        
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))

else:
    # Fallback if frontend is missing
    @app.get("/")
    def frontend_missing():
        return HTMLResponse("<h1>Frontend Files Not Found</h1><p>Check /home/rseivuhw/tts.testingprojects.online</p>", status_code=404)