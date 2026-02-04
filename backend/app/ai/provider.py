"""Abstract base class for AI providers."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract structured data.
        
        Args:
            resume_text: Raw text extracted from resume file
            
        Returns:
            Dictionary with structured resume data:
            {
                'skills': List[str],
                'work_experience': List[Dict],
                'education': List[Dict],
                'certifications': List[str],
                'projects': List[Dict],
                'summary': str
            }
        """
        pass
    
    @abstractmethod
    async def parse_job_description(self, job_description: str) -> Dict[str, Any]:
        """
        Parse job description and extract requirements.
        
        Args:
            job_description: Raw job description text
            
        Returns:
            Dictionary with parsed job requirements:
            {
                'required_skills': List[str],
                'preferred_skills': List[str],
                'experience_level': str,
                'education_requirements': List[str],
                'responsibilities': List[str]
            }
        """
        pass
    
    @abstractmethod
    async def match_resume_to_job(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate match score between resume and job.
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Parsed job requirements
            
        Returns:
            Dictionary with match results:
            {
                'score': float (0-100),
                'matching_skills': List[str],
                'missing_skills': List[str],
                'explanation': str
            }
        """
        pass
    
    @abstractmethod
    async def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> str:
        """
        Generate tailored resume content for specific job.
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Parsed job requirements
            
        Returns:
            Tailored resume content as formatted text
        """
        pass
    
    @abstractmethod
    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        company_info: Dict[str, Any]
    ) -> str:
        """
        Generate personalized cover letter.
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Parsed job requirements
            company_info: Information about the company
            
        Returns:
            Generated cover letter content
        """
        pass
    
    @abstractmethod
    async def extract_skills(self, text: str) -> List[str]:
        """
        Extract technical skills from text.
        
        Args:
            text: Text to extract skills from
            
        Returns:
            List of extracted skills
        """
        pass

