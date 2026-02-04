"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# ============= User Schemas =============
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    created_at: datetime
    preferences: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""
    user_id: Optional[int] = None


# ============= Resume Schemas =============
class ResumeBase(BaseModel):
    """Base resume schema."""
    filename: str


class ResumeCreate(ResumeBase):
    """Schema for creating a resume record."""
    file_path: str


class ResumeResponse(ResumeBase):
    """Schema for resume response."""
    id: int
    user_id: int
    file_path: str
    is_parsed: int
    parsed_data: Dict[str, Any] = {}
    created_at: datetime
    
    class Config:
        from_attributes = True


class ParsedResumeData(BaseModel):
    """Schema for parsed resume data."""
    skills: List[str] = []
    work_experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    certifications: List[str] = []
    projects: List[Dict[str, Any]] = []
    summary: Optional[str] = None


# ============= Job Listing Schemas =============
class JobListingBase(BaseModel):
    """Base job listing schema."""
    title: str
    company: str
    description: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    work_type: Optional[str] = None
    url: Optional[str] = None


class JobListingCreate(JobListingBase):
    """Schema for creating a job listing."""
    source: Optional[str] = "Manual"


class JobListingResponse(JobListingBase):
    """Schema for job listing response."""
    id: int
    source: Optional[str]
    posted_date: Optional[datetime]
    parsed_requirements: Dict[str, Any] = {}
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobRequirements(BaseModel):
    """Schema for parsed job requirements."""
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_level: Optional[str] = None
    education_requirements: List[str] = []
    responsibilities: List[str] = []


# ============= Application Schemas =============
class ApplicationBase(BaseModel):
    """Base application schema."""
    resume_id: int
    job_listing_id: int


class ApplicationCreate(ApplicationBase):
    """Schema for creating an application."""
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""
    status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    """Schema for application response."""
    id: int
    user_id: int
    status: str
    match_score: Optional[float]
    applied_date: datetime
    notes: Optional[str]
    tailored_resume_path: Optional[str]
    cover_letter_path: Optional[str]
    
    class Config:
        from_attributes = True


class ApplicationDetailResponse(ApplicationResponse):
    """Detailed application response with related data."""
    resume: ResumeResponse
    job_listing: JobListingResponse
    
    class Config:
        from_attributes = True


# ============= Matching Schemas =============
class MatchRequest(BaseModel):
    """Schema for job matching request."""
    resume_id: int
    job_listing_id: int


class MatchResponse(BaseModel):
    """Schema for match result."""
    resume_id: int
    job_listing_id: int
    match_score: float
    matching_skills: List[str]
    missing_skills: List[str]
    explanation: str


# ============= Service Schemas =============
class TailorResumeRequest(BaseModel):
    """Schema for resume tailoring request."""
    resume_id: int
    job_listing_id: int


class GenerateCoverLetterRequest(BaseModel):
    """Schema for cover letter generation request."""
    resume_id: int
    job_listing_id: int
    company_info: Optional[Dict[str, Any]] = None


class ServiceResponse(BaseModel):
    """Generic service response."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

