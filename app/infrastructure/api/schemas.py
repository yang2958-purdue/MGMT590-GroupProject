"""API request and response schemas"""
from pydantic import BaseModel
from typing import List, Optional, Dict


# Jobs API Schemas
class JobListingResponse(BaseModel):
    """Job listing from API"""
    id: str
    title: str
    company: str
    location: str
    description: str
    employment_type: Optional[str] = None
    requirements: List[str] = []
    preferred_qualifications: List[str] = []
    skills: List[str] = []
    posted_date: Optional[str] = None
    salary_range: Optional[str] = None


class JobsListResponse(BaseModel):
    """List of job listings"""
    jobs: List[JobListingResponse]
    total: int
    page: int
    limit: int


# Agent API Schemas
class AnalyzeRequest(BaseModel):
    """Request for resume analysis"""
    resume_text: str
    job_description: str
    mode: str = "compatibility_analysis"


class AnalyzeResponse(BaseModel):
    """Response from analysis"""
    semantic_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    recommendations: List[str]
    insights: Optional[Dict] = None


class OptimizeResumeRequest(BaseModel):
    """Request for resume optimization"""
    resume_text: str
    job_description: str
    constraints: Dict = {
        "do_not_invent_experience": True,
        "optimize_for_ats": True
    }


class OptimizeResumeResponse(BaseModel):
    """Response from resume optimization"""
    optimized_resume_text: str
    changes_summary: List[str]
    inserted_keywords: List[str]
    warnings: Optional[List[str]] = []


class OCRRequest(BaseModel):
    """Request for OCR"""
    image_data: Optional[str] = None


class OCRResponse(BaseModel):
    """Response from OCR"""
    text: str
    confidence: Optional[float] = None
