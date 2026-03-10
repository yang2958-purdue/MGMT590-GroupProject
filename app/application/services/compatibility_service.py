"""Compatibility analysis service"""
from app.domain.models import Resume, JobListing, AnalysisResult
from app.domain.scoring.scoring_engine import ScoringEngine
from app.infrastructure.api.agent_api_client import AgentAPIClient
from app.config.settings import Settings


class CompatibilityService:
    """Service for analyzing resume-job compatibility"""
    
    def __init__(self):
        self.scoring_engine = ScoringEngine()
        self.agent_client = AgentAPIClient() if Settings.USE_AGENTIC_ANALYSIS else None
    
    def analyze(self, resume: Resume, job: JobListing) -> AnalysisResult:
        """Analyze resume compatibility with job listing"""
        # Perform local scoring
        result = self.scoring_engine.analyze(resume, job)
        
        # Enhance with agent analysis if enabled
        if Settings.USE_AGENTIC_ANALYSIS and self.agent_client:
            try:
                agent_result = self.agent_client.analyze(
                    resume.cleaned_text,
                    job.get_all_text()
                )
                
                # Enhance results with agent insights
                if agent_result.get('semantic_score', 0) > 0:
                    result.semantic_score = max(
                        result.semantic_score,
                        agent_result['semantic_score']
                    )
                
                # Add agent recommendations
                if agent_result.get('recommendations'):
                    result.recommendations.extend(agent_result['recommendations'])
                    result.recommendations = list(set(result.recommendations))[:10]
                
            except Exception as e:
                # Log but don't fail - local scoring is sufficient
                print(f"Agent analysis failed: {e}")
        
        return result
