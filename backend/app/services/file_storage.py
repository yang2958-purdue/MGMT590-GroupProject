"""File storage service for handling file uploads."""
import os
import shutil
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException
from ..config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)


class FileStorageService:
    """Service for handling file uploads and storage."""
    
    def __init__(self):
        """Initialize file storage service."""
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.allowed_extensions_list
        
        # Create upload directory if it doesn't exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Upload directory: {self.upload_dir.absolute()}")
    
    def validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file.
        
        Args:
            file: Uploaded file
            
        Raises:
            HTTPException: If validation fails
        """
        # Check file extension
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(self.allowed_extensions)}"
            )
        
        # Check file size (note: this requires reading the file)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {self.max_file_size / 1024 / 1024:.1f}MB"
            )
        
        logger.info(f"File validated: {file.filename} ({file_size / 1024:.1f}KB)")
    
    async def save_file(self, file: UploadFile, user_id: int, subfolder: str = "resumes") -> Tuple[str, str]:
        """
        Save uploaded file to storage.
        
        Args:
            file: Uploaded file
            user_id: User ID for organizing files
            subfolder: Subfolder name (resumes, cover_letters, etc.)
            
        Returns:
            Tuple of (filename, file_path)
        """
        # Validate file
        self.validate_file(file)
        
        # Create user-specific directory
        user_dir = self.upload_dir / subfolder / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate safe filename
        original_filename = file.filename
        safe_filename = self._make_safe_filename(original_filename)
        file_path = user_dir / safe_filename
        
        # Handle duplicate filenames
        counter = 1
        while file_path.exists():
            name, ext = os.path.splitext(safe_filename)
            safe_filename = f"{name}_{counter}{ext}"
            file_path = user_dir / safe_filename
            counter += 1
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"File saved: {file_path}")
            return original_filename, str(file_path)
        
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file")
    
    def _make_safe_filename(self, filename: str) -> str:
        """Create a safe filename by removing special characters."""
        import re
        # Keep only alphanumeric, dots, hyphens, and underscores
        safe = re.sub(r'[^\w\s\-\.]', '', filename)
        safe = re.sub(r'[\s]+', '_', safe)
        return safe
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Path to file
            
        Returns:
            True if deleted successfully
        """
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
                logger.info(f"File deleted: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def get_file_path(self, file_path: str) -> Path:
        """Get Path object for file."""
        return Path(file_path)
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        return Path(file_path).exists()


# Singleton instance
file_storage_service = FileStorageService()

