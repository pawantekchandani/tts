from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UnicodeText, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(5), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    is_admin = Column(Boolean, default=False)
    
    conversions = relationship("Conversion", back_populates="user")


class Conversion(Base):
    __tablename__ = "conversions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # FIXED: Changed from 'Text' to 'UnicodeText' to fix the '????' issue
    text = Column(UnicodeText)
    
    voice_name = Column(String(100), default="Joanna")
    audio_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(5), ForeignKey("users.id"))
    
    user = relationship("User", back_populates="conversions")


    
class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True)
    token = Column(String(255), unique=True, index=True)
    expires_at = Column(DateTime)


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(5), ForeignKey("users.id"))
    amount = Column(Float)
    plan_type = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)


class PlanLimits(Base):
    __tablename__ = "plan_limits"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(50), unique=True, index=True)
    chats_per_day = Column(Integer)
    context_limit = Column(Integer)
    download_limit = Column(Integer)
    history_days = Column(Integer)


class DownloadHistory(Base):
    __tablename__ = "download_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(5), ForeignKey("users.id"))
    conversion_id = Column(Integer, ForeignKey("conversions.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
