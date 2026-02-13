"""
Resume parser module for handling resume input.
Supports file upload and pasted text with validation.
"""

from pathlib import Path
from typing import Optional
from utils import normalize_text, sanitize_input, validate_resume_text


class ResumeParser:
    """
    Handles resume input from file or direct text entry.
    Provides validation and normalization.
    """
    
    def __init__(self):
        self.resume_text: str = ""
        self.source: str = ""
    
    def load_from_file(self, file_path: str) -> tuple[bool, str]:
        """
        Load resume from a text file.
        
        Args:
            file_path: Path to the resume file
            
        Returns:
            Tuple of (success, message)
        """
        try:
            path = Path(file_path)
            
            # Check if file exists
            if not path.exists():
                return False, f"File not found: {file_path}"
            
            # Check if it's a file
            if not path.is_file():
                return False, f"Path is not a file: {file_path}"
            
            # Read file content
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file is empty
            if not content or not content.strip():
                return False, "File is empty. Please provide a valid resume."
            
            # Sanitize and normalize
            content = sanitize_input(content)
            
            # Validate
            is_valid, error_msg = validate_resume_text(content)
            if not is_valid:
                return False, error_msg
            
            # Store resume
            self.resume_text = content
            self.source = f"file: {path.name}"
            
            return True, f"Successfully loaded resume from {path.name}"
            
        except UnicodeDecodeError:
            return False, "Unable to read file. Please ensure it's a text file (UTF-8 encoded)."
        except PermissionError:
            return False, "Permission denied. Unable to read the file."
        except Exception as e:
            return False, f"Error reading file: {str(e)}"
    
    def load_from_text(self, text: str) -> tuple[bool, str]:
        """
        Load resume from pasted text.
        
        Args:
            text: Resume text content
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Check if text is empty
            if not text or not text.strip():
                return False, "Resume text is empty. Please provide your resume content."
            
            # Sanitize and normalize
            content = sanitize_input(text)
            
            # Validate
            is_valid, error_msg = validate_resume_text(content)
            if not is_valid:
                return False, error_msg
            
            # Store resume
            self.resume_text = content
            self.source = "pasted text"
            
            return True, "Successfully loaded resume from pasted text"
            
        except Exception as e:
            return False, f"Error processing text: {str(e)}"
    
    def get_resume_text(self) -> str:
        """
        Get the loaded resume text.
        
        Returns:
            Resume text or empty string if not loaded
        """
        return self.resume_text
    
    def get_resume_preview(self, max_chars: int = 200) -> str:
        """
        Get a preview of the loaded resume.
        
        Args:
            max_chars: Maximum characters to return
            
        Returns:
            Preview text
        """
        if not self.resume_text:
            return "No resume loaded"
        
        preview = self.resume_text[:max_chars]
        if len(self.resume_text) > max_chars:
            preview += "..."
        
        return preview
    
    def is_loaded(self) -> bool:
        """
        Check if a resume has been loaded.
        
        Returns:
            True if resume is loaded, False otherwise
        """
        return bool(self.resume_text)
    
    def clear(self) -> None:
        """
        Clear the loaded resume.
        """
        self.resume_text = ""
        self.source = ""
    
    def get_word_count(self) -> int:
        """
        Get word count of loaded resume.
        
        Returns:
            Number of words
        """
        if not self.resume_text:
            return 0
        return len(self.resume_text.split())
    
    def get_char_count(self) -> int:
        """
        Get character count of loaded resume.
        
        Returns:
            Number of characters
        """
        return len(self.resume_text)

