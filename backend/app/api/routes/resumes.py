"""Resume management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...models.user import User
from ...models.resume import Resume
from ...models.schemas import ResumeResponse
from ...services.file_storage import file_storage_service
from ...services.resume_parser import resume_parser_service
from ...api.dependencies import get_current_user
from ...utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a resume file.
    
    Args:
        file: Resume file (PDF or DOCX)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created resume record
    """
    try:
        # Save file
        filename, file_path = await file_storage_service.save_file(
            file,
            current_user.id,
            subfolder="resumes"
        )
        
        # Create resume record
        resume = Resume(
            user_id=current_user.id,
            filename=filename,
            file_path=file_path,
            is_parsed=0
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        logger.info(f"Resume uploaded: {filename} (user: {current_user.email})")
        return resume
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload resume"
        )


@router.get("/", response_model=List[ResumeResponse])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all resumes for current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of user's resumes
    """
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get resume details.
    
    Args:
        resume_id: Resume ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Resume details
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return resume


@router.post("/{resume_id}/parse", response_model=ResumeResponse)
async def parse_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse resume and extract structured data.
    
    Args:
        resume_id: Resume ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated resume with parsed data
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    try:
        # Parse resume
        parsed_data = await resume_parser_service.parse_resume(resume.file_path)
        
        # Extract original text
        original_text = resume_parser_service.extract_text(resume.file_path)
        
        # Update resume record
        resume.parsed_data = parsed_data
        resume.original_text = original_text
        resume.is_parsed = 1
        
        db.commit()
        db.refresh(resume)
        
        logger.info(f"Resume parsed: {resume_id}")
        return resume
    
    except Exception as e:
        logger.error(f"Failed to parse resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse resume"
        )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a resume.
    
    Args:
        resume_id: Resume ID
        current_user: Current authenticated user
        db: Database session
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Delete file
    file_storage_service.delete_file(resume.file_path)
    
    # Delete database record
    db.delete(resume)
    db.commit()
    
    logger.info(f"Resume deleted: {resume_id}")
    return None

