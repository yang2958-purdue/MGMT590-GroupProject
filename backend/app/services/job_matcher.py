"""Job matching service."""
from typing import Dict, Any
from ..ai.factory import get_ai_provider
from ..utils.logging import get_logger

logger = get_logger(__name__)


class JobMatcherService:
    """Service for matching resumes to jobs."""
    
    def __init__(self):
        """Initialize job matcher."""
        self.ai_provider = get_ai_provider()
    
    async def parse_job_description(self, job_description: str) -> Dict[str, Any]:
        """
        Parse job description and extract requirements.
        
        Args:
            job_description: Job description text
            
        Returns:
            Dictionary with parsed requirements
        """
        try:
            requirements = await self.ai_provider.parse_job_description(job_description)
            logger.info(f"Job description parsed: {len(requirements.get('required_skills', []))} required skills")
            return requirements
        
        except Exception as e:
            logger.error(f"Failed to parse job description: {e}")
            return {
                "required_skills": [],
                "preferred_skills": [],
                "experience_level": "Unknown",
                "education_requirements": [],
                "responsibilities": []
            }
    
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
            Dictionary with match results
        """
        try:
            match_result = await self.ai_provider.match_resume_to_job(
                resume_data,
                job_requirements
            )
            logger.info(f"Match calculated: {match_result.get('score', 0):.1f}%")
            return match_result
        
        except Exception as e:
            logger.error(f"Failed to calculate match: {e}")
            return {
                "score": 0.0,
                "matching_skills": [],
                "missing_skills": [],
                "explanation": "Failed to calculate match score"
            }
    
    async def find_best_matches(
        self,
        resume_data: Dict[str, Any],
        job_listings: list
    ) -> list:
        """
        Find best matching jobs for a resume.
        
        Args:
            resume_data: Parsed resume data
            job_listings: List of job listings with requirements
            
        Returns:
            List of jobs sorted by match score
        """
        matches = []
        
        for job in job_listings:
            job_requirements = job.get('parsed_requirements', {})
            
            if not job_requirements:
                # Parse job description if not already parsed
                job_requirements = await self.parse_job_description(job.get('description', ''))
            
            match_result = await self.match_resume_to_job(resume_data, job_requirements)
            
            matches.append({
                "job_id": job.get('id'),
                "job_title": job.get('title'),
                "company": job.get('company'),
                "match_score": match_result.get('score', 0),
                "matching_skills": match_result.get('matching_skills', []),
                "missing_skills": match_result.get('missing_skills', []),
                "explanation": match_result.get('explanation', '')
            })
        
        # Sort by match score (descending)
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        logger.info(f"Found {len(matches)} job matches")
        return matches


# Singleton instance
job_matcher_service = JobMatcherService()

