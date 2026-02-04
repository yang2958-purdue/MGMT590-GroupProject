"""Local Ollama AI provider implementation."""
import json
import requests
from typing import Dict, Any, List
from ..provider import AIProvider
from ...config import settings
from ...utils.logging import get_logger

logger = get_logger(__name__)


class LocalProvider(AIProvider):
    """Local Ollama AI provider."""
    
    def __init__(self):
        """Initialize local provider."""
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = "llama2"  # Default Ollama model
    
    async def _generate_text(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate text using Ollama."""
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": max_tokens}
                },
                timeout=60
            )
            response.raise_for_status()
            return response.json().get('response', '').strip()
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            return ""
    
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume using local model."""
        prompt = f"""Extract structured information from this resume and return ONLY JSON:

{resume_text[:3000]}

Return JSON:
{{
    "skills": [],
    "work_experience": [],
    "education": [],
    "certifications": [],
    "projects": [],
    "summary": ""
}}"""
        
        response = await self._generate_text(prompt, max_tokens=1500)
        
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
        
        response = await self._generate_text(prompt, max_tokens=1000)
        
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
        prompt = f"""Calculate match score:

Resume Skills: {resume_data.get('skills', [])}
Required: {job_requirements.get('required_skills', [])}

Return JSON with score 0-100:
{{
    "score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "explanation": ""
}}"""
        
        response = await self._generate_text(prompt, max_tokens=500)
        
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
Job Requirements: {job_requirements.get('required_skills', [])}

Write tailored resume:"""
        
        return await self._generate_text(prompt, max_tokens=1000)
    
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

Write professional cover letter:"""
        
        return await self._generate_text(prompt, max_tokens=800)
    
    async def extract_skills(self, text: str) -> List[str]:
        """Extract skills."""
        prompt = f"Extract skills from: {text[:500]}\n\nReturn JSON: {{\"skills\": []}}"
        response = await self._generate_text(prompt, max_tokens=300)
        
        try:
            return json.loads(response).get('skills', [])
        except:
            return []

