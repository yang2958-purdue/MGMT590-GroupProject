"""ATS evaluation service"""
from typing import Dict
from app.domain.models import Resume
from app.domain.scoring.ats_rules import ATSRules


class ATSService:
    """Service for ATS evaluation"""
    
    @staticmethod
    def evaluate(resume: Resume) -> Dict:
        """Evaluate resume for ATS compatibility"""
        return ATSRules.evaluate_resume(resume.cleaned_text, resume.sections)
    
    @staticmethod
    def get_ats_score(resume: Resume) -> float:
        """Get ATS score for resume"""
        result = ATSService.evaluate(resume)
        return result['score']
    
    @staticmethod
    def get_ats_warnings(resume: Resume) -> list:
        """Get ATS warnings for resume"""
        result = ATSService.evaluate(resume)
        return result['warnings']
    
    @staticmethod
    def get_ats_strengths(resume: Resume) -> list:
        """Get ATS strengths for resume"""
        result = ATSService.evaluate(resume)
        return result['strengths']
