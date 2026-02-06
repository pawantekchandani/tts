import logging  # <--- NEW: For logging
import sys      # <--- NEW: For terminal output
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Conversion, PasswordReset, DownloadedFile
from schemas import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest
from auth import hash_password, verify_password, create_access_token
import boto3
import os
from dotenv import load_dotenv
import uuid
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from schemas import ConversionCreate, ConversionOut, DownloadCreate, DownloadOut
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- 1. LOGGING CONFIGURATION (Setup 'app_errors.log') ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app_errors.log"),  # Write to file
        logging.StreamHandler(sys.stdout)       # Write to terminal
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(Path(__file__).parent / ".env")

app = FastAPI()

# --- 2. GLOBAL ERROR CATCHER (Middleware) ---
# This catches any crash, anywhere in the app, and logs it.
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"CRITICAL ERROR in {request.url.path}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error. Please check logs."}
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
    error_msg = "Validation error"
    if errors:
        error_msg = errors[0].get('msg', 'Validation error')
        field = '.'.join(str(loc) for loc in errors[0].get('loc', []))
        if field:
            error_msg = f"{field}: {error_msg}"
            
    logger.warning(f"Validation Error on {request.url.path}: {error_msg}")
    return JSONResponse(
        status_code=400,
        content={"detail": error_msg}
    )

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")
from auth import verify_token

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)
    if payload is None:
        logger.warning("Token verification failed (payload is None)")
        raise credentials_exception
        
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        logger.warning("Token payload missing 'sub' (user_id)")
        raise credentials_exception
        
    try:
        user_id = int(user_id_str)
    except ValueError:
         logger.warning(f"Token 'sub' is not a valid integer: {user_id_str}")
         raise credentials_exception

    logger.info(f"Authenticated Request for User ID: {user_id}")
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning(f"User ID {user_id} not found in database")
        raise credentials_exception
        
    return user

@app.get("/health")
def health_check():
    aws_status = "unknown"
    if polly_client:
        try:
            polly_client.describe_voices(LanguageCode='en-US')
            aws_status = "connected"
        except Exception as e:
            aws_status = f"error: {str(e)}"
            logger.error(f"Health Check Failed (AWS): {str(e)}")
    
    return {
        "status": "ok", 
        "message": "Server is running",
        "aws_polly": aws_status
    }

# --- AUTH ROUTES ---

@app.post("/api/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Signup attempt for: {user.email}")
        
        existing_user = db.query(User).filter(User.email == user.email).first()
        if existing_user:
            logger.warning(f"Signup failed - Email exists: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        password_bytes = len(user.password.encode('utf-8'))
        if password_bytes > 72:
            raise HTTPException(status_code=400, detail="Password too long (>72 bytes)")
        
        hashed_password = hash_password(user.password)
        db_user = User(email=user.email, hashed_password=hashed_password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"User created successfully: {user.email}")
        return db_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup Database Error: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        logger.warning(f"Login failed for: {user.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"User logged in: {user.email}")
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
    logger.info(f"Password reset requested for: {request.email}")
    return {"message": "Reset link sent to your email"}

@app.post("/api/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(PasswordReset).filter(PasswordReset.token == request.token).first()
    if not reset_entry or reset_entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.email == reset_entry.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = hash_password(request.new_password)
    db.delete(reset_entry)
    db.commit()
    logger.info(f"Password reset successful for user: {user.email}")
    return {"message": "Password updated successfully"}

# --- CONTENT ROUTES ---

@app.post("/convert", response_model=ConversionOut)
def convert_text(conversion: ConversionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not conversion.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if not polly_client:
         logger.error("AWS Polly client is not initialized.")
         raise HTTPException(status_code=500, detail="AWS Polly service is unavailable")

    try:
        logger.info(f"Starting conversion for user {current_user.email}. Text length: {len(conversion.text)}")
        
        response = polly_client.synthesize_speech(
            Text=conversion.text,
            OutputFormat='mp3',
            VoiceId=conversion.voice_id if hasattr(conversion, 'voice_id') and conversion.voice_id else 'Joanna',
            Engine=conversion.engine
        )
        
        now = datetime.utcnow()
        month_year = now.strftime("%B-%Y")
        audio_base_path = static_path / "audio" / month_year
        audio_base_path.mkdir(parents=True, exist_ok=True)
        
        filename = now.strftime("%b-%d_%H-%M-%S") + ".mp3"
        file_path = audio_base_path / filename
        
        with open(file_path, 'wb') as f:
            f.write(response['AudioStream'].read())
            
        audio_url = f"/static/audio/{month_year}/{filename}"
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
        
        logger.info(f"Conversion successful. Audio saved at: {audio_url}")
        return ConversionOut(
            id=db_conversion.id, 
            text=db_conversion.text, 
            voice_name=db_conversion.voice_name,
            audio_url=audio_url, 
            created_at=db_conversion.created_at.isoformat()
        )
    except Exception as e:
        logger.error(f"AWS Polly Conversion Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history", response_model=list[ConversionOut])
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logger.info(f"Fetching history for User ID: {current_user.id} ({current_user.email})")
    conversions = db.query(Conversion).filter(Conversion.user_id == current_user.id).order_by(Conversion.created_at.desc()).all()
    logger.info(f"Found {len(conversions)} records for User ID {current_user.id}")
    
    # Ensure all required fields are present; default voice_name if missing in old records
    results = []
    for c in conversions:
        if not c.voice_name:
            c.voice_name = "Unknown" 
        results.append(ConversionOut(
            id=c.id,
            text=c.text,
            voice_name=c.voice_name,
            audio_url=c.audio_url,
            created_at=c.created_at.isoformat() if c.created_at else datetime.now().isoformat()
        ))
    return results

@app.post("/history", response_model=ConversionOut)
def save_history(conversion: ConversionCreate, audio_url: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # This endpoint allows manual saving of history if generation is separated.
    # Note: /convert already saves history.
    try:
        now = datetime.utcnow()
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
        logger.info(f"History manually saved for user {current_user.email}")
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

# --- DUAL ROUTE SUPPORT FOR DOWNLOADS ---

@app.post("/downloads", response_model=DownloadOut)
@app.post("/api/downloads", response_model=DownloadOut)
def save_download(download: DownloadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user = current_user
        db_download = DownloadedFile(
            filename=download.filename,
            audio_url=download.audio_url,
            user_id=user.id,
            downloaded_at=datetime.utcnow()
        )
        db.add(db_download)
        db.commit()
        db.refresh(db_download)
        logger.info(f"Download recorded for user {user.email}: {download.filename}")
        return DownloadOut(
            id=db_download.id,
            filename=db_download.filename,
            audio_url=db_download.audio_url,
            downloaded_at=db_download.downloaded_at.isoformat()
        )
    except Exception as e:
        logger.error(f"Error saving download: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save download record")

@app.get("/downloads", response_model=list[DownloadOut])
@app.get("/api/downloads", response_model=list[DownloadOut])
def get_downloads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    downloads = db.query(DownloadedFile).filter(DownloadedFile.user_id == current_user.id).order_by(DownloadedFile.downloaded_at.desc()).all()
    return [DownloadOut(id=d.id, filename=d.filename, audio_url=d.audio_url, downloaded_at=d.downloaded_at.isoformat()) for d in downloads]

@app.delete("/downloads/{download_id}")
@app.delete("/api/downloads/{download_id}")
def delete_download(download_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
    download = db.query(DownloadedFile).filter(DownloadedFile.id == download_id, DownloadedFile.user_id == user.id).first()
    if not download:
        raise HTTPException(status_code=404, detail="Download not found")
        
    db.delete(download)
    db.commit()
    logger.info(f"Download record deleted: {download_id}")
    return {"message": "Download deleted successfully"}

# --- STATIC & FRONTEND SERVING ---

static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")

FRONTEND_PATH = "/home/rseivuhw/tts.testingprojects.online"

if os.path.exists(f"{FRONTEND_PATH}/assets"):
    app.mount("/assets", StaticFiles(directory=f"{FRONTEND_PATH}/assets"), name="assets")

@app.get("/")
async def serve_root():
    index_path = f"{FRONTEND_PATH}/index.html"
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    logger.error("Frontend index.html not found!")
    return HTMLResponse(content="<h1>Frontend Not Found</h1>", status_code=404)

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    file_location = f"{FRONTEND_PATH}/{full_path}"
    if full_path != "" and os.path.isfile(file_location):
        return FileResponse(file_location)
    
    index_path = f"{FRONTEND_PATH}/index.html"
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content="<h1>Frontend Not Found</h1>", status_code=404)
