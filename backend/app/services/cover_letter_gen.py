"""Cover letter generation service."""
from typing import Dict, Any
from pathlib import Path
from datetime import datetime
from ..ai.factory import get_ai_provider
from ..utils.logging import get_logger

logger = get_logger(__name__)


class CoverLetterGeneratorService:
    """Service for generating cover letters."""
    
    def __init__(self):
        """Initialize cover letter generator."""
        self.ai_provider = get_ai_provider()
    
    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        company_info: Dict[str, Any],
        output_path: str
    ) -> str:
        """
        Generate personalized cover letter.
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Parsed job requirements
            company_info: Company and job information
            output_path: Path to save cover letter
            
        Returns:
            Path to saved cover letter
        """
        try:
            # Generate cover letter using AI
            cover_letter_content = await self.ai_provider.generate_cover_letter(
                resume_data,
                job_requirements,
                company_info
            )
            
            # Format cover letter
            formatted_letter = self._format_cover_letter(
                cover_letter_content,
                company_info
            )
            
            # Save to file
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(formatted_letter)
            
            logger.info(f"Cover letter saved: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Failed to generate cover letter: {e}")
            raise
    
    def _format_cover_letter(self, content: str, company_info: Dict[str, Any]) -> str:
        """
        Format cover letter with proper structure.
        
        Args:
            content: AI-generated cover letter content
            company_info: Company information
            
        Returns:
            Formatted cover letter
        """
        sections = []
        
        # Date
        sections.append(datetime.now().strftime("%B %d, %Y"))
        sections.append("")
        
        # Company address (if available)
        company_name = company_info.get('company', '[Company Name]')
        sections.append(f"{company_name}")
        sections.append("[Company Address]")
        sections.append("")
        
        # Greeting
        sections.append(f"Dear Hiring Manager,")
        sections.append("")
        
        # Body (AI-generated content)
        sections.append(content)
        sections.append("")
        
        # Closing
        sections.append("Sincerely,")
        sections.append("")
        sections.append("[Your Name]")
        sections.append("[Your Contact Information]")
        
        return "\n".join(sections)
    
    async def generate_quick_cover_letter(
        self,
        job_title: str,
        company_name: str,
        key_skills: list
    ) -> str:
        """
        Generate a quick cover letter with minimal information.
        
        Args:
            job_title: Job title
            company_name: Company name
            key_skills: List of key skills to highlight
            
        Returns:
            Generated cover letter content
        """
        company_info = {
            "title": job_title,
            "company": company_name
        }
        
        resume_data = {
            "skills": key_skills,
            "work_experience": [],
            "education": []
        }
        
        job_requirements = {
            "required_skills": key_skills[:5],
            "preferred_skills": []
        }
        
        try:
            cover_letter = await self.ai_provider.generate_cover_letter(
                resume_data,
                job_requirements,
                company_info
            )
            return cover_letter
        
        except Exception as e:
            logger.error(f"Failed to generate quick cover letter: {e}")
            return f"Dear Hiring Manager,\n\nI am writing to express my interest in the {job_title} position at {company_name}..."


# Singleton instance
cover_letter_generator_service = CoverLetterGeneratorService()

