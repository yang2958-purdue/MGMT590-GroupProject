"""Resume tailoring service."""
from typing import Dict, Any
from pathlib import Path
from ..ai.factory import get_ai_provider
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ResumeTailorService:
    """Service for tailoring resumes to specific jobs."""
    
    def __init__(self):
        """Initialize resume tailor."""
        self.ai_provider = get_ai_provider()
    
    async def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        output_path: str
    ) -> str:
        """
        Generate tailored resume for specific job.
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Parsed job requirements
            output_path: Path to save tailored resume
            
        Returns:
            Path to saved tailored resume
        """
        try:
            # Generate tailored content using AI
            tailored_content = await self.ai_provider.tailor_resume(
                resume_data,
                job_requirements
            )
            
            # Save to file
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(self._format_tailored_resume(resume_data, tailored_content))
            
            logger.info(f"Tailored resume saved: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Failed to tailor resume: {e}")
            raise
    
    def _format_tailored_resume(self, resume_data: Dict[str, Any], tailored_content: str) -> str:
        """
        Format tailored resume with proper structure.
        
        Args:
            resume_data: Original resume data
            tailored_content: AI-generated tailored content
            
        Returns:
            Formatted resume text
        """
        sections = []
        
        # Header (if available in resume data)
        sections.append("=" * 60)
        sections.append("TAILORED RESUME")
        sections.append("=" * 60)
        sections.append("")
        
        # Summary/Objective
        sections.append("PROFESSIONAL SUMMARY")
        sections.append("-" * 60)
        sections.append(tailored_content)
        sections.append("")
        
        # Skills
        if resume_data.get('skills'):
            sections.append("TECHNICAL SKILLS")
            sections.append("-" * 60)
            sections.append(", ".join(resume_data['skills']))
            sections.append("")
        
        # Work Experience
        if resume_data.get('work_experience'):
            sections.append("WORK EXPERIENCE")
            sections.append("-" * 60)
            for exp in resume_data['work_experience']:
                sections.append(f"{exp.get('role', 'N/A')} - {exp.get('company', 'N/A')}")
                sections.append(f"{exp.get('duration', 'N/A')}")
                sections.append(exp.get('description', ''))
                sections.append("")
        
        # Education
        if resume_data.get('education'):
            sections.append("EDUCATION")
            sections.append("-" * 60)
            for edu in resume_data['education']:
                sections.append(f"{edu.get('degree', 'N/A')} - {edu.get('institution', 'N/A')}")
                sections.append(f"{edu.get('year', 'N/A')}")
                sections.append("")
        
        # Certifications
        if resume_data.get('certifications'):
            sections.append("CERTIFICATIONS")
            sections.append("-" * 60)
            sections.append(", ".join(resume_data['certifications']))
            sections.append("")
        
        # Projects
        if resume_data.get('projects'):
            sections.append("PROJECTS")
            sections.append("-" * 60)
            for project in resume_data['projects']:
                sections.append(f"{project.get('name', 'N/A')}")
                sections.append(project.get('description', ''))
                sections.append("")
        
        return "\n".join(sections)


# Singleton instance
resume_tailor_service = ResumeTailorService()

