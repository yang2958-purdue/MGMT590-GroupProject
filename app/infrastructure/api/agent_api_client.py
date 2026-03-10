"""Agent/LLM API client"""
import requests
from typing import Dict, Optional
from app.config.settings import Settings
from app.config.endpoints import AgentAPIEndpoints
from app.infrastructure.api.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    OptimizeResumeRequest, OptimizeResumeResponse
)


class AgentAPIClient:
    """Client for agent/LLM API"""
    
    def __init__(self, api_key: Optional[str] = None, timeout: int = 60):
        self.api_key = api_key or Settings.AGENT_API_KEY
        self.timeout = timeout
    
    def analyze(self, resume_text: str, job_description: str, 
                mode: str = "compatibility_analysis") -> Dict:
        """Analyze resume against job description using AI"""
        try:
            request = AnalyzeRequest(
                resume_text=resume_text,
                job_description=job_description,
                mode=mode
            )
            
            headers = {}
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            response = requests.post(
                AgentAPIEndpoints.analyze(),
                json=request.dict(),
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            data = response.json()
            
            result = AnalyzeResponse(**data)
            return result.dict()
            
        except requests.RequestException as e:
            # Return empty result as fallback
            return {
                'semantic_score': 0.0,
                'matched_skills': [],
                'missing_skills': [],
                'recommendations': [],
                'error': str(e)
            }
    
    def optimize_resume(self, resume_text: str, job_description: str,
                       do_not_invent: bool = True,
                       optimize_for_ats: bool = True) -> Dict:
        """Optimize resume for specific job using AI"""
        try:
            request = OptimizeResumeRequest(
                resume_text=resume_text,
                job_description=job_description,
                constraints={
                    'do_not_invent_experience': do_not_invent,
                    'optimize_for_ats': optimize_for_ats
                }
            )
            
            headers = {}
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            response = requests.post(
                AgentAPIEndpoints.optimize_resume(),
                json=request.dict(),
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            data = response.json()
            
            result = OptimizeResumeResponse(**data)
            return result.dict()
            
        except requests.RequestException as e:
            # Return original resume as fallback
            return {
                'optimized_resume_text': resume_text,
                'changes_summary': [],
                'inserted_keywords': [],
                'warnings': [f'API optimization failed: {str(e)}. Returning original resume.']
            }
    
    def is_available(self) -> bool:
        """Check if agent API is available"""
        return bool(self.api_key)
