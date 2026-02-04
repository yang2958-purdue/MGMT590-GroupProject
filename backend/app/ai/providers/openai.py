"""OpenAI AI provider implementation."""
import json
from typing import Dict, Any, List
from openai import AsyncOpenAI
from ..provider import AIProvider
from ...config import settings
from ...utils.logging import get_logger

logger = get_logger(__name__)


class OpenAIProvider(AIProvider):
    """OpenAI AI provider."""
    
    def __init__(self):
        """Initialize OpenAI provider."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"  # Cost-effective model
    
    async def _generate_completion(self, messages: List[Dict[str, str]], max_tokens: int = 1000) -> str:
        """Generate completion using OpenAI."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            return ""
    
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume using OpenAI."""
        messages = [
            {"role": "system", "content": "You are a resume parser. Extract structured data and return valid JSON only."},
            {"role": "user", "content": f"""Extract information from this resume and return JSON:

{resume_text[:3000]}

Return this structure:
{{
    "skills": ["skill1", "skill2"],
    "work_experience": [{{"company": "", "role": "", "duration": "", "description": ""}}],
    "education": [{{"institution": "", "degree": "", "year": ""}}],
    "certifications": ["cert1"],
    "projects": [{{"name": "", "description": ""}}],
    "summary": ""
}}"""}
        ]
        
        response = await self._generate_completion(messages, max_tokens=1500)
        
        try:
            # Try to parse as JSON
            parsed = json.loads(response)
            return parsed
        except Exception as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            return {"skills": [], "work_experience": [], "education": [], "certifications": [], "projects": [], "summary": ""}
    
    async def parse_job_description(self, job_description: str) -> Dict[str, Any]:
        """Parse job description using OpenAI."""
        messages = [
            {"role": "system", "content": "You are a job description parser. Extract requirements and return valid JSON."},
            {"role": "user", "content": f"""Parse this job description:

{job_description[:2000]}

Return JSON:
{{
    "required_skills": [],
    "preferred_skills": [],
    "experience_level": "",
    "education_requirements": [],
    "responsibilities": []
}}"""}
        ]
        
        response = await self._generate_completion(messages, max_tokens=1000)
        
        try:
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to parse job description: {e}")
            return {"required_skills": [], "preferred_skills": [], "experience_level": "", "education_requirements": [], "responsibilities": []}
    
    async def match_resume_to_job(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Match resume to job using OpenAI."""
        messages = [
            {"role": "system", "content": "You are a job matching expert. Analyze fit and return JSON."},
            {"role": "user", "content": f"""Calculate match score:

Resume Skills: {resume_data.get('skills', [])}
Job Required: {job_requirements.get('required_skills', [])}
Job Preferred: {job_requirements.get('preferred_skills', [])}

Return JSON:
{{
    "score": 0-100,
    "matching_skills": [],
    "missing_skills": [],
    "explanation": ""
}}"""}
        ]
        
        response = await self._generate_completion(messages, max_tokens=500)
        
        try:
            return json.loads(response)
        except Exception as e:
            logger.error(f"Match calculation failed: {e}")
            return {"score": 50.0, "matching_skills": [], "missing_skills": [], "explanation": "Unable to calculate"}
    
    async def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> str:
        """Generate tailored resume."""
        messages = [
            {"role": "system", "content": "You are a resume writer. Create tailored resume content."},
            {"role": "user", "content": f"""Tailor resume for job:

Skills: {resume_data.get('skills', [])}
Experience: {resume_data.get('work_experience', [])}
Job Required: {job_requirements.get('required_skills', [])}

Write tailored resume sections highlighting relevant experience:"""}
        ]
        
        return await self._generate_completion(messages, max_tokens=1000)
    
    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        company_info: Dict[str, Any]
    ) -> str:
        """Generate cover letter."""
        messages = [
            {"role": "system", "content": "You are a professional cover letter writer."},
            {"role": "user", "content": f"""Write cover letter:

Job: {company_info.get('title', 'Position')}
Company: {company_info.get('company', 'Company')}
Skills: {resume_data.get('skills', [])}
Required: {job_requirements.get('required_skills', [])}

Write professional 3-paragraph cover letter:"""}
        ]
        
        return await self._generate_completion(messages, max_tokens=800)
    
    async def extract_skills(self, text: str) -> List[str]:
        """Extract skills from text."""
        messages = [
            {"role": "system", "content": "Extract technical skills and return JSON array."},
            {"role": "user", "content": f"Extract skills from: {text[:500]}\n\nReturn JSON: {{\"skills\": []}}"}
        ]
        
        response = await self._generate_completion(messages, max_tokens=300)
        
        try:
            return json.loads(response).get('skills', [])
        except:
            return []

