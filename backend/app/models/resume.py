"""Resume model."""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Resume(Base):
    """Resume model for storing uploaded resumes and parsed data."""
    
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    original_text = Column(Text, nullable=True)  # Extracted text from file
    parsed_data = Column(JSON, default={})  # Structured data from AI parsing
    is_parsed = Column(Integer, default=0)  # 0 = not parsed, 1 = parsed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")

