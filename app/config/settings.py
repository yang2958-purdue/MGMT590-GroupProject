"""Application configuration and settings management"""
import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME = "Resume Compatibility Analyzer"
    APP_VERSION = "1.0.0"
    
    # Directories
    BASE_DIR = Path(__file__).parent.parent.parent
    UPLOAD_DIR = BASE_DIR / "uploads"
    CACHE_DIR = BASE_DIR / "cache"
    
    # API Endpoints
    JOBS_API_BASE_URL = os.getenv("JOBS_API_BASE_URL", "https://api.example.com")
    AGENT_API_BASE_URL = os.getenv("AGENT_API_BASE_URL", "https://agent-api.example.com")
    OCR_API_BASE_URL = os.getenv("OCR_API_BASE_URL", "https://ocr-api.example.com")
    
    # API Keys
    AGENT_API_KEY = os.getenv("AGENT_API_KEY", "")
    OCR_API_KEY = os.getenv("OCR_API_KEY", "")
    
    # Feature Flags
    USE_AGENTIC_ANALYSIS = os.getenv("USE_AGENTIC_ANALYSIS", "false").lower() == "true"
    USE_REMOTE_OCR = os.getenv("USE_REMOTE_OCR", "false").lower() == "true"
    ENABLE_BROWSER_AUTOFILL = os.getenv("ENABLE_BROWSER_AUTOFILL", "true").lower() == "true"
    
    # File Upload
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"}
    
    # Scoring Weights
    COMPATIBILITY_WEIGHTS = {
        "keyword": 0.30,
        "skill": 0.25,
        "semantic": 0.20,
        "experience": 0.15,
        "education": 0.10
    }
    
    ATS_WEIGHTS = {
        "keyword_presence": 0.35,
        "section_headings": 0.20,
        "formatting": 0.15,
        "measurable_bullets": 0.15,
        "structure_quality": 0.15
    }
    
    # API Timeouts
    API_TIMEOUT = 30  # seconds
    
    # Browser Automation
    BROWSER_HEADLESS = os.getenv("BROWSER_HEADLESS", "false").lower() == "true"
    BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "30000"))  # milliseconds
    AUTO_SUBMIT_FORMS = os.getenv("AUTO_SUBMIT_FORMS", "false").lower() == "true"
    
    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist"""
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)


# Initialize directories on import
Settings.ensure_directories()
