"""Tests for scoring engine"""
import pytest
from app.domain.models import Resume, JobListing
from app.domain.scoring.keyword_matcher import KeywordMatcher
from app.domain.scoring.scoring_engine import ScoringEngine


def test_keyword_extraction():
    """Test keyword extraction"""
    text = "I am a software engineer with Python and JavaScript experience"
    keywords = KeywordMatcher.extract_keywords(text)
    
    assert "software" in keywords
    assert "engineer" in keywords
    assert "python" in keywords
    assert "javascript" in keywords


def test_keyword_overlap():
    """Test keyword overlap calculation"""
    resume_text = "I have Python, Java, and React experience"
    job_text = "Looking for Python and React developer"
    
    result = KeywordMatcher.calculate_keyword_overlap(resume_text, job_text)
    
    assert result['score'] > 0
    assert 'python' in result['matched'] or 'react' in result['matched']


def test_scoring_engine():
    """Test complete scoring engine"""
    resume = Resume(
        raw_text="Software Engineer with 5 years Python experience",
        cleaned_text="Software Engineer with 5 years Python experience",
        skills=["python", "javascript", "react"],
        experience_years=5.0
    )
    
    job = JobListing(
        id="test_001",
        title="Software Engineer",
        company="Test Corp",
        location="Remote",
        description="Looking for Python developer with React experience",
        requirements=["3+ years experience", "Python", "React"],
        skills=["python", "react", "aws"]
    )
    
    result = ScoringEngine.analyze(resume, job)
    
    assert result.compatibility_score >= 0
    assert result.compatibility_score <= 100
    assert result.ats_score >= 0
    assert result.ats_score <= 100
    assert len(result.matched_skills) > 0
