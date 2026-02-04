"""Job listing model."""
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class JobListing(Base):
    """Job listing model for storing job postings."""
    
    __tablename__ = "job_listings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    company = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    work_type = Column(String, nullable=True)  # Remote, Hybrid, On-site
    url = Column(String, nullable=True)
    source = Column(String, nullable=True)  # Indeed, LinkedIn, Manual, etc.
    posted_date = Column(DateTime(timezone=True), nullable=True)
    parsed_requirements = Column(JSON, default={})  # AI-parsed job requirements
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    applications = relationship("Application", back_populates="job_listing")

