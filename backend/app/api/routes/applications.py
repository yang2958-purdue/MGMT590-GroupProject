"""Application tracking API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ...database import get_db
from ...models.user import User
from ...models.application import Application
from ...models.resume import Resume
from ...models.job_listing import JobListing
from ...models.schemas import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationDetailResponse
)
from ...api.dependencies import get_current_user
from ...utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    app_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new application record.
    
    Args:
        app_data: Application data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created application
    """
    # Verify resume belongs to user
    resume = db.query(Resume).filter(
        Resume.id == app_data.resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Verify job exists
    job = db.query(JobListing).filter(JobListing.id == app_data.job_listing_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Create application
    application = Application(
        user_id=current_user.id,
        resume_id=app_data.resume_id,
        job_listing_id=app_data.job_listing_id,
        notes=app_data.notes,
        status="Pending"
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    logger.info(f"Application created: {application.id} (user: {current_user.email})")
    return application


@router.get("/", response_model=List[ApplicationDetailResponse])
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all applications for current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of applications with details
    """
    applications = db.query(Application).filter(
        Application.user_id == current_user.id
    ).options(
        joinedload(Application.resume),
        joinedload(Application.job_listing)
    ).all()
    
    return applications


@router.get("/{application_id}", response_model=ApplicationDetailResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get application details.
    
    Args:
        application_id: Application ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Application details
    """
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == current_user.id
    ).options(
        joinedload(Application.resume),
        joinedload(Application.job_listing)
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return application


@router.patch("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    update_data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update application status or notes.
    
    Args:
        application_id: Application ID
        update_data: Update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated application
    """
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Update fields
    if update_data.status is not None:
        application.status = update_data.status
    
    if update_data.notes is not None:
        application.notes = update_data.notes
    
    db.commit()
    db.refresh(application)
    
    logger.info(f"Application updated: {application_id}")
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an application.
    
    Args:
        application_id: Application ID
        current_user: Current authenticated user
        db: Database session
    """
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == current_user.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    db.delete(application)
    db.commit()
    
    logger.info(f"Application deleted: {application_id}")
    return None

