"""HuggingFace AI provider implementation."""
import json
import re
from typing import Dict, Any, List
from huggingface_hub import InferenceClient
from ..provider import AIProvider
from ...config import settings
from ...utils.logging import get_logger

logger = get_logger(__name__)


class HuggingFaceProvider(AIProvider):
    """HuggingFace AI provider using free inference API."""
    
    def __init__(self):
        """Initialize HuggingFace provider."""
        self.client = InferenceClient(token=settings.HUGGINGFACE_API_KEY if settings.HUGGINGFACE_API_KEY else None)
        self.model = "mistralai/Mixtral-8x7B-Instruct-v0.1"  # Free inference model
    
    async def _generate_text(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate text using HuggingFace inference."""
        try:
            response = self.client.text_generation(
                prompt,
                model=self.model,
                max_new_tokens=max_tokens,
                temperature=0.7,
                return_full_text=False
            )
            return response.strip()
        except Exception as e:
            logger.error(f"HuggingFace generation error: {e}")
            return ""
    
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume using AI."""
        prompt = f"""Extract structured information from this resume and return ONLY a JSON object with no additional text.

Resume:
{resume_text[:3000]}

Return a JSON object with this exact structure:
{{
    "skills": ["skill1", "skill2"],
    "work_experience": [{{"company": "...", "role": "...", "duration": "...", "description": "..."}}],
    "education": [{{"institution": "...", "degree": "...", "year": "..."}}],
    "certifications": ["cert1", "cert2"],
    "projects": [{{"name": "...", "description": "..."}}],
    "summary": "..."
}}

JSON:"""
        
        response = await self._generate_text(prompt, max_tokens=1500)
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return parsed
        except Exception as e:
            logger.error(f"Failed to parse resume JSON: {e}")
        
        # Fallback: basic parsing
        return self._basic_resume_parse(resume_text)
    
    def _basic_resume_parse(self, resume_text: str) -> Dict[str, Any]:
        """Basic fallback resume parsing."""
        # Extract skills using common patterns
        skills = self._extract_skills_basic(resume_text)
        
        return {
            "skills": skills,
            "work_experience": [],
            "education": [],
            "certifications": [],
            "projects": [],
            "summary": resume_text[:200] + "..."
        }
    
    def _extract_skills_basic(self, text: str) -> List[str]:
        """Basic skill extraction using patterns."""
        common_skills = [
            "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "Ruby",
            "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "FastAPI",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
            "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD",
            "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
            "REST API", "GraphQL", "Microservices", "Agile", "Scrum"
        ]
        
        skills = []
        text_lower = text.lower()
        for skill in common_skills:
            if skill.lower() in text_lower:
                skills.append(skill)
        
        return list(set(skills))
    
    async def parse_job_description(self, job_description: str) -> Dict[str, Any]:
        """Parse job description using AI."""
        prompt = f"""Extract requirements from this job description and return ONLY a JSON object.

Job Description:
{job_description[:2000]}

Return JSON with this structure:
{{
    "required_skills": ["skill1", "skill2"],
    "preferred_skills": ["skill1", "skill2"],
    "experience_level": "Entry/Mid/Senior",
    "education_requirements": ["degree1"],
    "responsibilities": ["task1", "task2"]
}}

JSON:"""
        
        response = await self._generate_text(prompt, max_tokens=1000)
        
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return parsed
        except Exception as e:
            logger.error(f"Failed to parse job description JSON: {e}")
        
        # Fallback
        return {
            "required_skills": self._extract_skills_basic(job_description),
            "preferred_skills": [],
            "experience_level": "Mid",
            "education_requirements": [],
            "responsibilities": []
        }
    
    async def match_resume_to_job(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate match score."""
        resume_skills = set(skill.lower() for skill in resume_data.get('skills', []))
        required_skills = set(skill.lower() for skill in job_requirements.get('required_skills', []))
        preferred_skills = set(skill.lower() for skill in job_requirements.get('preferred_skills', []))
        
        # Calculate matching skills
        matching_required = resume_skills.intersection(required_skills)
        matching_preferred = resume_skills.intersection(preferred_skills)
        missing_required = required_skills - resume_skills
        
        # Calculate score
        required_match_rate = len(matching_required) / len(required_skills) if required_skills else 1.0
        preferred_match_rate = len(matching_preferred) / len(preferred_skills) if preferred_skills else 0.5
        
        score = (required_match_rate * 0.7 + preferred_match_rate * 0.3) * 100
        
        explanation = f"Matched {len(matching_required)}/{len(required_skills)} required skills"
        if preferred_skills:
            explanation += f" and {len(matching_preferred)}/{len(preferred_skills)} preferred skills"
        
        return {
            "score": round(score, 2),
            "matching_skills": list(matching_required.union(matching_preferred)),
            "missing_skills": list(missing_required),
            "explanation": explanation
        }
    
    async def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> str:
        """Generate tailored resume."""
        prompt = f"""Create a tailored resume highlighting relevant experience for this job.

Resume Data:
- Skills: {', '.join(resume_data.get('skills', [])[:10])}
- Experience: {len(resume_data.get('work_experience', []))} positions
- Education: {len(resume_data.get('education', []))} entries

Job Requirements:
- Required Skills: {', '.join(job_requirements.get('required_skills', [])[:10])}
- Experience Level: {job_requirements.get('experience_level', 'Not specified')}

Generate a tailored professional resume summary focusing on matching skills and experience:"""
        
        response = await self._generate_text(prompt, max_tokens=800)
        return response
    
    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any],
        company_info: Dict[str, Any]
    ) -> str:
        """Generate cover letter."""
        company_name = company_info.get('company', 'your company')
        job_title = company_info.get('title', 'the position')
        
        prompt = f"""Write a professional cover letter for this job application.

Applicant Skills: {', '.join(resume_data.get('skills', [])[:8])}
Job Title: {job_title}
Company: {company_name}
Required Skills: {', '.join(job_requirements.get('required_skills', [])[:8])}

Write a concise, professional cover letter (3-4 paragraphs):"""
        
        response = await self._generate_text(prompt, max_tokens=600)
        return response
    
    async def extract_skills(self, text: str) -> List[str]:
        """Extract skills from text."""
        return self._extract_skills_basic(text)

