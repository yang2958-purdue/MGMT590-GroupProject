"""Application model."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Application(Base):
    """Application model for tracking job applications."""
    
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_listing_id = Column(Integer, ForeignKey("job_listings.id"), nullable=False)
    
    status = Column(String, default="Pending")  # Pending, Submitted, Interviewing, Offer, Rejected
    match_score = Column(Float, nullable=True)  # 0-100 match score
    
    applied_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    tailored_resume_path = Column(String, nullable=True)
    cover_letter_path = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    job_listing = relationship("JobListing", back_populates="applications")

