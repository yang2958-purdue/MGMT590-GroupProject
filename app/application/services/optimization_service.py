"""Resume optimization service"""
from app.domain.models import Resume, JobListing, OptimizationResult
from app.infrastructure.api.agent_api_client import AgentAPIClient
from app.config.settings import Settings
from app.domain.scoring.keyword_matcher import KeywordMatcher
from app.domain.utils.skill_extractor import match_skills


class OptimizationService:
    """Service for resume optimization"""
    
    def __init__(self):
        self.agent_client = AgentAPIClient() if Settings.USE_AGENTIC_ANALYSIS else None
    
    def optimize(self, resume: Resume, job: JobListing) -> OptimizationResult:
        """Optimize resume for specific job"""
        
        # Try agent-based optimization first if available
        if Settings.USE_AGENTIC_ANALYSIS and self.agent_client and self.agent_client.is_available():
            try:
                agent_result = self.agent_client.optimize_resume(
                    resume.cleaned_text,
                    job.get_all_text(),
                    do_not_invent=True,
                    optimize_for_ats=True
                )
                
                return OptimizationResult(
                    optimized_resume_text=agent_result['optimized_resume_text'],
                    changes_summary=agent_result['changes_summary'],
                    inserted_keywords=agent_result['inserted_keywords'],
                    warnings=agent_result.get('warnings', [])
                )
            except Exception as e:
                print(f"Agent optimization failed: {e}, using local optimization")
        
        # Fall back to local rule-based optimization
        return self._local_optimize(resume, job)
    
    def _local_optimize(self, resume: Resume, job: JobListing) -> OptimizationResult:
        """Local rule-based optimization"""
        optimized_text = resume.cleaned_text
        changes = []
        inserted_keywords = []
        improvements = []
        
        # Analyze gaps
        keyword_result = KeywordMatcher.calculate_keyword_overlap(
            resume.cleaned_text,
            job.get_all_text()
        )
        
        skill_match = match_skills(resume.skills, job.skills)
        
        # Generate optimization suggestions
        changes.append("Analyzed resume against job requirements")
        
        # Suggest keyword additions
        missing_keywords = keyword_result['missing'][:5]
        if missing_keywords:
            improvements.append(
                f"Consider adding these keywords: {', '.join(missing_keywords)}"
            )
            changes.append(f"Identified {len(missing_keywords)} missing keywords")
        
        # Suggest skill additions
        missing_skills = skill_match['missing'][:3]
        if missing_skills:
            improvements.append(
                f"Add these skills to your skills section if applicable: {', '.join(missing_skills)}"
            )
            changes.append(f"Identified {len(missing_skills)} missing skills")
        
        # Suggest section improvements
        if 'summary' not in resume.sections:
            improvements.append(
                "Add a professional summary highlighting your relevant experience"
            )
            changes.append("Recommended adding professional summary section")
        
        if 'skills' not in resume.sections:
            improvements.append(
                "Add a skills section with relevant technical and soft skills"
            )
            changes.append("Recommended adding skills section")
        
        # Create optimized version with suggestions
        optimization_notes = "\n\n=== OPTIMIZATION SUGGESTIONS ===\n"
        optimization_notes += "\n".join(f"• {imp}" for imp in improvements)
        optimization_notes += f"\n\nMissing Keywords: {', '.join(missing_keywords)}"
        optimization_notes += f"\nMissing Skills: {', '.join(missing_skills)}"
        
        return OptimizationResult(
            optimized_resume_text=optimized_text + optimization_notes,
            changes_summary=changes,
            inserted_keywords=missing_keywords,
            warnings=[
                "Note: This is a local optimization with suggestions.",
                "Enable agent-based optimization for automatic rewriting."
            ],
            improvements=improvements
        )
