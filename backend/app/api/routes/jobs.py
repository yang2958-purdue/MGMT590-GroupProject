"""Job listing API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ...database import get_db
from ...models.user import User
from ...models.job_listing import JobListing
from ...models.schemas import JobListingCreate, JobListingResponse
from ...services.job_matcher import job_matcher_service
from ...api.dependencies import get_current_user
from ...utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/import", response_model=JobListingResponse, status_code=status.HTTP_201_CREATED)
async def import_job(
    job_data: JobListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually import a job listing.
    
    Args:
        job_data: Job listing data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Created job listing
    """
    try:
        # Create job listing
        job = JobListing(**job_data.model_dump())
        
        # Parse job description
        if job.description:
            parsed_requirements = await job_matcher_service.parse_job_description(job.description)
            job.parsed_requirements = parsed_requirements
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info(f"Job imported: {job.title} at {job.company}")
        return job
    
    except Exception as e:
        logger.error(f"Failed to import job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import job"
        )


@router.get("/", response_model=List[JobListingResponse])
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    company: Optional[str] = None,
    location: Optional[str] = None,
    work_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List job listings with optional filters.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        company: Filter by company name
        location: Filter by location
        work_type: Filter by work type
        db: Database session
        
    Returns:
        List of job listings
    """
    query = db.query(JobListing)
    
    if company:
        query = query.filter(JobListing.company.ilike(f"%{company}%"))
    
    if location:
        query = query.filter(JobListing.location.ilike(f"%{location}%"))
    
    if work_type:
        query = query.filter(JobListing.work_type.ilike(f"%{work_type}%"))
    
    jobs = query.offset(skip).limit(limit).all()
    return jobs


@router.get("/{job_id}", response_model=JobListingResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    Get job listing details.
    
    Args:
        job_id: Job ID
        db: Database session
        
    Returns:
        Job listing details
    """
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return job

