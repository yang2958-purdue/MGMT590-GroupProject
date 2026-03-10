"""Analysis result domain model"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class AnalysisResult:
    """Analysis result data model"""
    compatibility_score: float
    ats_score: float
    
    # Component scores
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    skills_score: float = 0.0
    experience_score: float = 0.0
    education_score: float = 0.0
    
    # Matched items
    matched_keywords: List[str] = field(default_factory=list)
    missing_keywords: List[str] = field(default_factory=list)
    matched_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    
    # ATS analysis
    ats_warnings: List[str] = field(default_factory=list)
    ats_strengths: List[str] = field(default_factory=list)
    
    # Recommendations
    recommendations: List[str] = field(default_factory=list)
    
    def get_compatibility_grade(self) -> str:
        """Get letter grade for compatibility score"""
        if self.compatibility_score >= 90:
            return "A+"
        elif self.compatibility_score >= 85:
            return "A"
        elif self.compatibility_score >= 80:
            return "A-"
        elif self.compatibility_score >= 75:
            return "B+"
        elif self.compatibility_score >= 70:
            return "B"
        elif self.compatibility_score >= 65:
            return "B-"
        elif self.compatibility_score >= 60:
            return "C+"
        elif self.compatibility_score >= 55:
            return "C"
        else:
            return "C-"
    
    def get_ats_grade(self) -> str:
        """Get letter grade for ATS score"""
        if self.ats_score >= 90:
            return "Excellent"
        elif self.ats_score >= 80:
            return "Good"
        elif self.ats_score >= 70:
            return "Fair"
        elif self.ats_score >= 60:
            return "Poor"
        else:
            return "Very Poor"
