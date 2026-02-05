from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    
    conversions = relationship("Conversion", back_populates="user")
    downloads = relationship("DownloadedFile", back_populates="user")

class Conversion(Base):
    __tablename__ = "conversions"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    audio_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="conversions")

class DownloadedFile(Base):
    # FIXED: Table name changed to match your MySQL database
    __tablename__ = "downloaded_files" 
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    audio_url = Column(String(500))
    downloaded_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="downloads")
    
class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True)
    token = Column(String(255), unique=True, index=True)
    expires_at = Column(DateTime)