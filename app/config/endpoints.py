"""API endpoint definitions"""
from app.config.settings import Settings


class JobsAPIEndpoints:
    """Job listing API endpoints"""
    BASE_URL = Settings.JOBS_API_BASE_URL
    
    @classmethod
    def get_jobs(cls) -> str:
        return f"{cls.BASE_URL}/jobs"
    
    @classmethod
    def get_job_details(cls, job_id: str) -> str:
        return f"{cls.BASE_URL}/jobs/{job_id}"


class AgentAPIEndpoints:
    """Agent/LLM API endpoints"""
    BASE_URL = Settings.AGENT_API_BASE_URL
    
    @classmethod
    def analyze(cls) -> str:
        return f"{cls.BASE_URL}/agent/analyze"
    
    @classmethod
    def optimize_resume(cls) -> str:
        return f"{cls.BASE_URL}/agent/optimize-resume"
    
    @classmethod
    def ocr(cls) -> str:
        return f"{cls.BASE_URL}/agent/ocr"


class OCRAPIEndpoints:
    """OCR API endpoints"""
    BASE_URL = Settings.OCR_API_BASE_URL
    
    @classmethod
    def extract_text(cls) -> str:
        return f"{cls.BASE_URL}/ocr/extract"
