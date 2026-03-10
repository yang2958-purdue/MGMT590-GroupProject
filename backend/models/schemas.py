"""
Pydantic models for request/response validation
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ResumeUploadResponse(BaseModel):
    """Response after resume upload and parsing"""
    resume_id: str
    filename: str
    skills: List[str]
    experience_years: Optional[int] = None
    education: List[str]
    raw_text: str
    parsed_sections: Dict[str, Any]


class JobSearchRequest(BaseModel):
    """Request to search for jobs"""
    companies: List[str] = Field(..., min_length=1, description="List of target companies")
    job_titles: List[str] = Field(..., min_length=1, description="List of job title keywords")
    location: Optional[str] = Field(None, description="Job location (optional)")
    max_results: int = Field(50, ge=1, le=200, description="Maximum number of results")


class JobListing(BaseModel):
    """Individual job listing"""
    job_id: str
    title: str
    company: str
    description: str
    url: str
    location: Optional[str] = None
    date_posted: Optional[str] = None
    source: str  # "serpapi", "linkedin", "company_page"


class JobSearchResponse(BaseModel):
    """Response from job search"""
    jobs: List[JobListing]
    total_found: int
    search_timestamp: datetime


class FitScoreRequest(BaseModel):
    """Request to score a job against resume"""
    resume_id: str
    job_id: str
    resume_text: str
    job_description: str
    use_ai: bool = Field(False, description="Use Claude AI for scoring (slower but better)")


class FitScoreResponse(BaseModel):
    """Response with fit score"""
    job_id: str
    score: float = Field(..., ge=0, le=10, description="Fit score from 0-10")
    matching_skills: List[str]
    missing_skills: List[str]
    seniority_fit: Optional[str] = None
    qualitative_analysis: Optional[str] = None
    method: str  # "tfidf" or "ai"


class TailorResumeRequest(BaseModel):
    """Request to tailor resume for a job"""
    resume_id: str
    job_id: str
    resume_text: str
    job_description: str
    output_format: str = Field("docx", regex="^(docx|pdf|txt)$")


class TailorResumeResponse(BaseModel):
    """Response with tailored resume"""
    tailored_resume_id: str
    tailored_text: str
    changes_made: List[str]
    download_url: str
    format: str


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

