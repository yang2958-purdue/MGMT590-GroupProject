"""Resume parsing service."""
import PyPDF2
import docx
from pathlib import Path
from typing import Dict, Any
from ..ai.factory import get_ai_provider
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ResumeParserService:
    """Service for parsing resume files."""
    
    def __init__(self):
        """Initialize resume parser."""
        self.ai_provider = get_ai_provider()
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract text from PDF file.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Extracted text
        """
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            
            logger.info(f"Extracted {len(text)} characters from PDF")
            return text.strip()
        
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            return ""
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """
        Extract text from DOCX file.
        
        Args:
            file_path: Path to DOCX file
            
        Returns:
            Extracted text
        """
        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            
            logger.info(f"Extracted {len(text)} characters from DOCX")
            return text.strip()
        
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {e}")
            return ""
    
    def extract_text(self, file_path: str) -> str:
        """
        Extract text from resume file (auto-detect format).
        
        Args:
            file_path: Path to resume file
            
        Returns:
            Extracted text
        """
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_ext in ['.docx', '.doc']:
            return self.extract_text_from_docx(file_path)
        else:
            logger.error(f"Unsupported file format: {file_ext}")
            return ""
    
    async def parse_resume(self, file_path: str) -> Dict[str, Any]:
        """
        Parse resume and extract structured data using AI.
        
        Args:
            file_path: Path to resume file
            
        Returns:
            Dictionary with parsed resume data
        """
        # Extract text from file
        resume_text = self.extract_text(file_path)
        
        if not resume_text:
            logger.error("No text extracted from resume")
            return {
                "skills": [],
                "work_experience": [],
                "education": [],
                "certifications": [],
                "projects": [],
                "summary": "Failed to extract text from resume"
            }
        
        # Use AI provider to parse structured data
        try:
            parsed_data = await self.ai_provider.parse_resume(resume_text)
            logger.info(f"Resume parsed successfully: {len(parsed_data.get('skills', []))} skills found")
            return parsed_data
        
        except Exception as e:
            logger.error(f"Failed to parse resume with AI: {e}")
            return {
                "skills": [],
                "work_experience": [],
                "education": [],
                "certifications": [],
                "projects": [],
                "summary": resume_text[:500] + "..."
            }


# Singleton instance
resume_parser_service = ResumeParserService()

