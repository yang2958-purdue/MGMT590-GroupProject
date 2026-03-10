"""Optimization result domain model"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class OptimizationResult:
    """Resume optimization result data model"""
    optimized_resume_text: str
    changes_summary: List[str] = field(default_factory=list)
    inserted_keywords: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)
    
    def has_changes(self) -> bool:
        """Check if any changes were made"""
        return len(self.changes_summary) > 0
    
    def get_summary(self) -> str:
        """Get a summary of changes"""
        if not self.has_changes():
            return "No changes made"
        
        summary = f"{len(self.changes_summary)} changes made:\n"
        summary += "\n".join(f"• {change}" for change in self.changes_summary[:5])
        
        if len(self.changes_summary) > 5:
            summary += f"\n... and {len(self.changes_summary) - 5} more"
        
        return summary
