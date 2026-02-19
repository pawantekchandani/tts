from pydantic import BaseModel, validator
from typing import Optional
import re

class UserCreate(BaseModel):
    email: str
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        # Simple email validation regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v
    
    @validator('password')
    def validate_password_length(cls, v):
        # Bcrypt has a strict 72-byte limit (not 72 characters!)
        password_bytes = len(v.encode('utf-8'))
        if password_bytes > 72:
            raise ValueError(f'Password cannot be longer than 72 bytes (your password is {password_bytes} bytes). Please use a shorter password.')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserOut(BaseModel):
    id: str
    email: str
    is_admin: bool
    
    class Config:
        from_attributes = True

class UserProfile(UserOut):
    plan_type: str
    credits_used: int = 0
    credit_limit: int = 0
    member_since: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    plan_type: str = "Basic"

class ConversionCreate(BaseModel):
    text: str
    voice_id: str = "Joanna" # Default voice
    engine: str = "neural" # Default engine

class ConversionOut(BaseModel):
    id: int
    text: str
    voice_name: Optional[str] = None
    engine: Optional[str] = None
    audio_url: str
    created_at: str
    
    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password_length(cls, v):
        password_bytes = len(v.encode('utf-8'))
        if password_bytes > 72:
            raise ValueError(f'Password cannot be longer than 72 bytes. Your password is {password_bytes} bytes.')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class PlanLimitUpdate(BaseModel):
    credit_limit: int
    history_days: int

class UserPlanUpdate(BaseModel):
    user_id: str
    plan_type: str
