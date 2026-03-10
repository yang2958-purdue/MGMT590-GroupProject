"""Resume ingestion service"""
import os
from pathlib import Path
from typing import Optional
from app.domain.models import Resume
from app.infrastructure.parsers.pdf_parser import PDFParser
from app.infrastructure.parsers.docx_parser import DOCXParser
from app.infrastructure.parsers.text_parser import TextParser
from app.infrastructure.parsers.image_parser import ImageParser
from app.infrastructure.ocr.local_ocr_client import LocalOCRClient
from app.infrastructure.ocr.api_ocr_client import APIOCRClient
from app.domain.utils.text_cleaning import clean_resume_text
from app.domain.utils.section_parser import parse_resume_sections, estimate_experience_years
from app.domain.utils.skill_extractor import extract_skills_from_text, extract_certifications, extract_education_degrees
from app.config.settings import Settings


class ResumeIngestionService:
    """Service for ingesting and parsing resumes"""
    
    def __init__(self):
        self.local_ocr = LocalOCRClient()
        self.api_ocr = APIOCRClient() if Settings.USE_REMOTE_OCR else None
    
    def ingest_file(self, file_path: str) -> Resume:
        """Ingest resume from file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Get file extension
        file_ext = Path(file_path).suffix.lower()
        file_name = Path(file_path).name
        
        # Validate file type
        if file_ext not in Settings.ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Extract text based on file type
        raw_text = self._extract_text(file_path, file_ext)
        
        # Create resume object
        return self._create_resume(raw_text, file_name, file_ext)
    
    def ingest_text(self, text: str) -> Resume:
        """Ingest resume from raw text"""
        return self._create_resume(text, None, ".txt")
    
    def _extract_text(self, file_path: str, file_ext: str) -> str:
        """Extract text from file based on type"""
        try:
            if file_ext == '.pdf':
                text = PDFParser.parse(file_path)
                # If PDF extraction yields little text, try OCR
                if len(text.strip()) < 100:
                    text = self._extract_with_ocr(file_path)
                return text
            
            elif file_ext == '.docx':
                return DOCXParser.parse(file_path)
            
            elif file_ext == '.txt':
                return TextParser.parse(file_path)
            
            elif file_ext in ['.jpg', '.jpeg', '.png']:
                return self._extract_with_ocr(file_path)
            
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
        
        except Exception as e:
            raise Exception(f"Failed to extract text: {str(e)}")
    
    def _extract_with_ocr(self, file_path: str) -> str:
        """Extract text using OCR"""
        # Try API OCR first if enabled
        if Settings.USE_REMOTE_OCR and self.api_ocr and self.api_ocr.is_available():
            try:
                return self.api_ocr.extract_text(file_path)
            except Exception as e:
                print(f"API OCR failed, falling back to local: {e}")
        
        # Fall back to local OCR
        if self.local_ocr.is_available():
            return self.local_ocr.extract_text(file_path)
        else:
            raise Exception(
                "OCR is not available. Please install Tesseract or configure API OCR."
            )
    
    def _create_resume(self, raw_text: str, file_name: Optional[str], 
                      file_type: str) -> Resume:
        """Create Resume object from raw text"""
        # Clean text
        cleaned_text = clean_resume_text(raw_text)
        
        # Parse sections
        sections = parse_resume_sections(cleaned_text)
        
        # Extract skills
        skills = extract_skills_from_text(cleaned_text)
        
        # Add skills from skills section if present
        if 'skills' in sections:
            from app.domain.utils.skill_extractor import extract_skills_from_section
            section_skills = extract_skills_from_section(sections['skills'])
            skills = list(set(skills + section_skills))
        
        # Extract experience years
        experience_years = estimate_experience_years(cleaned_text)
        
        # Extract education
        education = extract_education_degrees(cleaned_text)
        
        # Extract certifications
        certifications = extract_certifications(cleaned_text)
        
        return Resume(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            file_name=file_name,
            file_type=file_type,
            sections=sections,
            skills=skills,
            experience_years=experience_years,
            education=education,
            certifications=certifications
        )
