"""Job listing domain model"""
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class JobListing:
    """Job listing data model"""
    id: str
    title: str
    company: str
    location: str
    description: str
    employment_type: Optional[str] = None
    requirements: List[str] = field(default_factory=list)
    preferred_qualifications: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    posted_date: Optional[str] = None
    salary_range: Optional[str] = None
    
    def get_all_text(self) -> str:
        """Get all job listing text combined"""
        parts = [
            self.title,
            self.company,
            self.description,
            " ".join(self.requirements),
            " ".join(self.preferred_qualifications),
            " ".join(self.skills)
        ]
        return " ".join(filter(None, parts))
    
    def get_required_skills(self) -> List[str]:
        """Get all required skills from requirements and skills list"""
        return list(set(self.skills + [
            skill for req in self.requirements 
            for skill in req.split() if len(skill) > 2
        ]))
