"""Resume domain model"""
from dataclasses import dataclass, field
from typing import Optional, Dict, List


@dataclass
class Resume:
    """Resume data model"""
    raw_text: str
    cleaned_text: str = ""
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    sections: Dict[str, str] = field(default_factory=dict)
    skills: List[str] = field(default_factory=list)
    experience_years: Optional[float] = None
    education: List[str] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Initialize cleaned text if not provided"""
        if not self.cleaned_text:
            self.cleaned_text = self.raw_text
    
    def has_section(self, section_name: str) -> bool:
        """Check if resume has a specific section"""
        return section_name.lower() in [s.lower() for s in self.sections.keys()]
    
    def get_section(self, section_name: str) -> Optional[str]:
        """Get section content by name (case-insensitive)"""
        for key, value in self.sections.items():
            if key.lower() == section_name.lower():
                return value
        return None
