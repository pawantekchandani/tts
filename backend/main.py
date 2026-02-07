import sentry_sdk # <--- NEW: Sentry SDK
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

# --- 1. SENTRY CONFIGURATION ---
# Initialize Sentry at the very top for complete coverage
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

# --- 3. SENTRY DEBUG ROUTE ---
# Visit https://testingprojects.online/api/debug-sentry to test
@app.get("/api/debug-sentry")
async def trigger_error():
    division_by_zero = 1 / 0
    return {"message": "Should not reach here"}

# --- 4. GLOBAL ERROR CATCHER ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Note: Sentry captures this automatically now!
        logger.error(f"CRITICAL ERROR in {request.url.path}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error. Please check logs/Sentry."}
        )

# --- REST OF YOUR ORIGINAL CODE (No changes below) ---

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
        
    user_id = user_id_str

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
        
        # Determine strict or retry logic for ID uniqueness
        for _ in range(5):
             new_id = generate_user_id()
             if not db.query(User).filter(User.id == new_id).first():
                 break
        else:
             raise HTTPException(status_code=500, detail="Could not generate unique User ID after retries")

        db_user = User(
            id=new_id, 
            email=user.email, 
            hashed_password=hashed_password
        )
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

    # --- EMAIL SENDING LOGIC ---
    try:
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")
        smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("MAIL_PORT", "587"))

        if not sender_email or not sender_password:
            logger.error("Email credentials missing in .env")
            return {"message": "Reset link could not be sent (Server Config Error)"}

        # Determine Frontend URL (Local or Prod)
        # In production this should be your domain, in local it's localhost:3000
        # For now, let's try to detect or use a base URL env var, fallback to origin header
        origin = req.headers.get("origin")
        if not origin:
            origin = "http://localhost:3000" # Fallback for local testing
            
        reset_link = f"{origin}/reset-password?token={token}"

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = request.email
        msg['Subject'] = "Password Reset Request - PollyGlot"

        body = f"""
        <html>
          <body>
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
            <a href="{reset_link}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>Or copy this link: {reset_link}</p>
          </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Reset email sent successfully to {request.email}")
        return {"message": "Reset link sent to your email"}

    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        # We still return success to avoid leaking valid emails, or you can return error if preferred for debugging
        return {"message": "Reset link sent to your email (if valid)"}

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

@app.post("/api/convert", response_model=ConversionOut)
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

@app.get("/api/history", response_model=list[ConversionOut])
def get_history(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logger.info(f"Fetching history for User ID: {current_user.id} ({current_user.email}) - Skip: {skip}, Limit: {limit}")
    conversions = db.query(Conversion).filter(Conversion.user_id == current_user.id).order_by(Conversion.created_at.desc()).offset(skip).limit(limit).all()
    logger.info(f"Found {len(conversions)} records for User ID {current_user.id}")
    
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

@app.post("/api/history", response_model=ConversionOut)
def save_history(conversion: ConversionCreate, audio_url: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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