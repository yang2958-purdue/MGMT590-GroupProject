"""Anthropic AI provider implementation."""
import json
from typing import Dict, Any, List
from anthropic import AsyncAnthropic
from ..provider import AIProvider
from ...config import settings
from ...utils.logging import get_logger

logger = get_logger(__name__)


class AnthropicProvider(AIProvider):
    """Anthropic Claude AI provider."""
    
    def __init__(self):
        """Initialize Anthropic provider."""
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-haiku-20240307"  # Fast and cost-effective
    
    async def _generate_completion(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate completion using Anthropic."""
        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            return ""
    
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume using Claude."""
        prompt = f"""Parse this resume and return ONLY valid JSON:

{resume_text[:3000]}

Return this structure:
{{
    "skills": [],
    "work_experience": [{{"company": "", "role": "", "duration": "", "description": ""}}],
    "education": [{{"institution": "", "degree": "", "year": ""}}],
    "certifications": [],
    "projects": [{{"name": "", "description": ""}}],
    "summary": ""
}}"""
        
        response = await self._generate_completion(prompt, max_tokens=1500)
        
        try:
            return json.loads(response)
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {"skills": [], "work_experience": [], "education": [], "certifications": [], "projects": [], "summary": ""}
    
    async def parse_job_description(self, job_description: str) -> Dict[str, Any]:
        """Parse job description."""
        prompt = f"""Parse job description and return JSON:

{job_description[:2000]}

Return:
{{
    "required_skills": [],
    "preferred_skills": [],
    "experience_level": "",
    "education_requirements": [],
    "responsibilities": []
}}"""
        
        response = await self._generate_completion(prompt, max_tokens=1000)
        
        try:
            return json.loads(response)
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return {"required_skills": [], "preferred_skills": [], "experience_level": "", "education_requirements": [], "responsibilities": []}
    
    async def match_resume_to_job(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Match resume to job."""
        prompt = f"""Calculate job match:

Resume Skills: {resume_data.get('skills', [])}
Required Skills: {job_requirements.get('required_skills', [])}
Preferred Skills: {job_requirements.get('preferred_skills', [])}

Return JSON:
{{
    "score": 0-100,
    "matching_skills": [],
    "missing_skills": [],
    "explanation": ""
}}"""
        
        response = await self._generate_completion(prompt, max_tokens=500)
        
        try:
            return json.loads(response)
        except Exception as e:
            logger.error(f"Match error: {e}")
            return {"score": 50.0, "matching_skills": [], "missing_skills": [], "explanation": "Unable to calculate"}
    
    async def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> str:
        """Generate tailored resume."""
        prompt = f"""Create tailored resume:

Skills: {resume_data.get('skills', [])}
Experience: {resume_data.get('work_experience', [])}
Job Requirements: {job_requirements.get('required_skills', [])}

Write professional tailored resume:"""
        
        return await self._generate_completion(prompt, max_tokens=1000)
    
    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        company_info: Dict[str, Any]
    ) -> str:
        """Generate cover letter."""
        prompt = f"""Write cover letter:

Job: {company_info.get('title', 'Position')}
Company: {company_info.get('company', 'Company')}
Skills: {resume_data.get('skills', [])}
Required: {job_requirements.get('required_skills', [])}

Write 3-paragraph professional cover letter:"""
        
        return await self._generate_completion(prompt, max_tokens=800)
    
    async def extract_skills(self, text: str) -> List[str]:
        """Extract skills."""
        prompt = f"Extract technical skills from: {text[:500]}\n\nReturn JSON: {{\"skills\": []}}"
        response = await self._generate_completion(prompt, max_tokens=300)
        
        try:
            return json.loads(response).get('skills', [])
        except:
            return []

