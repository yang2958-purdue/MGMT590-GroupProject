"""Job matching API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.user import User
from ...models.resume import Resume
from ...models.job_listing import JobListing
from ...models.schemas import MatchRequest, MatchResponse, TailorResumeRequest, GenerateCoverLetterRequest, ServiceResponse
from ...services.job_matcher import job_matcher_service
from ...services.resume_tailor import resume_tailor_service
from ...services.cover_letter_gen import cover_letter_generator_service
from ...api.dependencies import get_current_user
from ...utils.logging import get_logger
from pathlib import Path

logger = get_logger(__name__)

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/match", response_model=MatchResponse)
async def match_resume_to_job(
    match_request: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate match score between resume and job.
    
    Args:
        match_request: Match request data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Match result with score and details
    """
    # Verify resume belongs to user
    resume = db.query(Resume).filter(
        Resume.id == match_request.resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if not resume.is_parsed or not resume.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume not parsed. Please parse the resume first."
        )
    
    # Get job listing
    job = db.query(JobListing).filter(JobListing.id == match_request.job_listing_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Parse job requirements if not already parsed
    if not job.parsed_requirements:
        job.parsed_requirements = await job_matcher_service.parse_job_description(job.description)
        db.commit()
    
    # Calculate match
    try:
        match_result = await job_matcher_service.match_resume_to_job(
            resume.parsed_data,
            job.parsed_requirements
        )
        
        return MatchResponse(
            resume_id=match_request.resume_id,
            job_listing_id=match_request.job_listing_id,
            **match_result
        )
    
    except Exception as e:
        logger.error(f"Failed to calculate match: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate match"
        )


@router.post("/tailor-resume", response_model=ServiceResponse)
async def tailor_resume(
    tailor_request: TailorResumeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate tailored resume for specific job.
    
    Args:
        tailor_request: Tailor request data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Service response with file path
    """
    # Verify resume
    resume = db.query(Resume).filter(
        Resume.id == tailor_request.resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume or not resume.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or not parsed"
        )
    
    # Get job
    job = db.query(JobListing).filter(JobListing.id == tailor_request.job_listing_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Parse job if needed
    if not job.parsed_requirements:
        job.parsed_requirements = await job_matcher_service.parse_job_description(job.description)
        db.commit()
    
    # Generate tailored resume
    try:
        output_path = f"uploads/tailored/{current_user.id}/resume_{resume.id}_job_{job.id}.txt"
        file_path = await resume_tailor_service.tailor_resume(
            resume.parsed_data,
            job.parsed_requirements,
            output_path
        )
        
        return ServiceResponse(
            success=True,
            message="Resume tailored successfully",
            data={"file_path": file_path}
        )
    
    except Exception as e:
        logger.error(f"Failed to tailor resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to tailor resume"
        )


@router.post("/generate-cover-letter", response_model=ServiceResponse)
async def generate_cover_letter(
    cover_letter_request: GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate cover letter for job application.
    
    Args:
        cover_letter_request: Cover letter request data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Service response with file path
    """
    # Verify resume
    resume = db.query(Resume).filter(
        Resume.id == cover_letter_request.resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume or not resume.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or not parsed"
        )
    
    # Get job
    job = db.query(JobListing).filter(JobListing.id == cover_letter_request.job_listing_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Parse job if needed
    if not job.parsed_requirements:
        job.parsed_requirements = await job_matcher_service.parse_job_description(job.description)
        db.commit()
    
    # Prepare company info
    company_info = cover_letter_request.company_info or {}
    company_info.update({
        "title": job.title,
        "company": job.company
    })
    
    # Generate cover letter
    try:
        output_path = f"uploads/cover_letters/{current_user.id}/cover_letter_{resume.id}_job_{job.id}.txt"
        file_path = await cover_letter_generator_service.generate_cover_letter(
            resume.parsed_data,
            job.parsed_requirements,
            company_info,
            output_path
        )
        
        return ServiceResponse(
            success=True,
            message="Cover letter generated successfully",
            data={"file_path": file_path}
        )
    
    except Exception as e:
        logger.error(f"Failed to generate cover letter: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate cover letter"
        )

