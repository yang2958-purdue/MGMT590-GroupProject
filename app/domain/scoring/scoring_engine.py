"""Main scoring engine that coordinates all matchers"""
from typing import Dict
from app.domain.models import Resume, JobListing, AnalysisResult
from app.domain.scoring.keyword_matcher import KeywordMatcher
from app.domain.scoring.semantic_matcher import SemanticMatcher
from app.domain.scoring.ats_rules import ATSRules
from app.domain.utils.skill_extractor import match_skills
from app.config.settings import Settings


class ScoringEngine:
    """Main scoring engine for resume-job compatibility"""
    
    @staticmethod
    def analyze(resume: Resume, job: JobListing) -> AnalysisResult:
        """Perform complete analysis of resume against job listing"""
        
        # Keyword matching
        keyword_result = KeywordMatcher.calculate_keyword_overlap(
            resume.cleaned_text,
            job.get_all_text()
        )
        
        # Semantic matching
        semantic_result = SemanticMatcher.calculate_similarity(
            resume.cleaned_text,
            job.get_all_text()
        )
        
        # Skill matching
        skill_match = match_skills(resume.skills, job.skills)
        skill_score = ScoringEngine._calculate_skill_score(
            len(skill_match['matched']),
            len(job.skills)
        )
        
        # Experience matching
        experience_score = ScoringEngine._calculate_experience_score(
            resume.experience_years,
            job.requirements
        )
        
        # Education matching
        education_score = ScoringEngine._calculate_education_score(
            resume.education,
            job.requirements
        )
        
        # ATS evaluation
        ats_result = ATSRules.evaluate_resume(resume.cleaned_text, resume.sections)
        
        # Calculate weighted compatibility score
        weights = Settings.COMPATIBILITY_WEIGHTS
        compatibility_score = (
            keyword_result['score'] * weights['keyword'] +
            skill_score * weights['skill'] +
            semantic_result['score'] * weights['semantic'] +
            experience_score * weights['experience'] +
            education_score * weights['education']
        )
        
        # Generate recommendations
        recommendations = ScoringEngine._generate_recommendations(
            keyword_result,
            skill_match,
            ats_result,
            experience_score,
            education_score
        )
        
        return AnalysisResult(
            compatibility_score=min(compatibility_score, 100.0),
            ats_score=ats_result['score'],
            semantic_score=semantic_result['score'],
            keyword_score=keyword_result['score'],
            skills_score=skill_score,
            experience_score=experience_score,
            education_score=education_score,
            matched_keywords=keyword_result['matched'][:15],
            missing_keywords=keyword_result['missing'][:15],
            matched_skills=skill_match['matched'],
            missing_skills=skill_match['missing'],
            ats_warnings=ats_result['warnings'],
            ats_strengths=ats_result['strengths'],
            recommendations=recommendations
        )
    
    @staticmethod
    def _calculate_skill_score(matched_count: int, total_required: int) -> float:
        """Calculate skill match score"""
        if total_required == 0:
            return 80.0  # Default if no skills specified
        
        match_ratio = matched_count / total_required
        
        if match_ratio >= 0.8:
            return 100.0
        elif match_ratio >= 0.6:
            return 85.0
        elif match_ratio >= 0.4:
            return 70.0
        elif match_ratio >= 0.2:
            return 50.0
        else:
            return 30.0
    
    @staticmethod
    def _calculate_experience_score(experience_years: float, requirements: list) -> float:
        """Calculate experience match score"""
        if not experience_years:
            return 50.0  # Neutral score if experience not detected
        
        # Try to extract required years from requirements
        import re
        required_years = 0
        
        for req in requirements:
            match = re.search(r'(\d+)\+?\s*years?', req.lower())
            if match:
                required_years = max(required_years, int(match.group(1)))
        
        if required_years == 0:
            return 80.0  # Default if no specific requirement
        
        # Score based on how well experience matches requirement
        if experience_years >= required_years:
            return 100.0
        elif experience_years >= required_years * 0.75:
            return 85.0
        elif experience_years >= required_years * 0.5:
            return 70.0
        else:
            return 50.0
    
    @staticmethod
    def _calculate_education_score(education: list, requirements: list) -> float:
        """Calculate education match score"""
        if not education:
            return 60.0  # Neutral if no education detected
        
        # Check if degree is required
        req_text = ' '.join(requirements).lower()
        
        education_text = ' '.join(education).lower()
        
        # Check for degree levels
        has_phd = 'phd' in education_text or 'doctorate' in education_text
        has_masters = 'master' in education_text or 'mba' in education_text
        has_bachelors = 'bachelor' in education_text or 'b.s' in education_text or 'b.a' in education_text
        
        requires_phd = 'phd' in req_text or 'doctorate' in req_text
        requires_masters = 'master' in req_text
        requires_bachelors = 'bachelor' in req_text or 'degree' in req_text
        
        if requires_phd:
            return 100.0 if has_phd else 70.0 if has_masters else 50.0
        elif requires_masters:
            return 100.0 if (has_masters or has_phd) else 75.0 if has_bachelors else 60.0
        elif requires_bachelors:
            return 100.0 if (has_bachelors or has_masters or has_phd) else 60.0
        else:
            return 80.0  # No specific requirement
    
    @staticmethod
    def _generate_recommendations(keyword_result: Dict, skill_match: Dict,
                                  ats_result: Dict, experience_score: float,
                                  education_score: float) -> list:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Keyword recommendations
        if keyword_result['score'] < 70:
            top_missing = keyword_result['missing'][:5]
            if top_missing:
                recommendations.append(
                    f"Add these key terms to your resume: {', '.join(top_missing[:3])}"
                )
        
        # Skill recommendations
        if skill_match['missing']:
            top_missing_skills = skill_match['missing'][:3]
            recommendations.append(
                f"Consider adding these skills if you have them: {', '.join(top_missing_skills)}"
            )
        
        # Experience recommendations
        if experience_score < 70:
            recommendations.append(
                "Highlight more relevant work experience or projects"
            )
        
        # ATS recommendations
        if ats_result['score'] < 75:
            recommendations.append(
                "Improve ATS compatibility: " + "; ".join(ats_result['warnings'][:2])
            )
        
        # General recommendations
        if keyword_result['matched_count'] < 10:
            recommendations.append(
                "Tailor your resume more specifically to this job description"
            )
        
        return recommendations[:7]  # Return top 7 recommendations
