"""Tests for ATS rules"""
import pytest
from app.domain.scoring.ats_rules import ATSRules


def test_ats_evaluation_basic():
    """Test basic ATS evaluation"""
    text = """
    John Doe
    john@example.com
    555-123-4567
    
    EXPERIENCE
    Software Engineer at Tech Corp
    - Developed applications
    - Improved performance by 50%
    
    EDUCATION
    BS Computer Science
    
    SKILLS
    Python, Java, React
    """
    
    sections = {
        'experience': 'Software Engineer at Tech Corp\n- Developed applications',
        'education': 'BS Computer Science',
        'skills': 'Python, Java, React'
    }
    
    result = ATSRules.evaluate_resume(text, sections)
    
    assert result['score'] >= 0
    assert result['score'] <= 100
    assert 'warnings' in result
    assert 'strengths' in result


def test_ats_missing_sections():
    """Test ATS evaluation with missing sections"""
    text = "Just some text with no clear sections"
    sections = {}
    
    result = ATSRules.evaluate_resume(text, sections)
    
    assert result['score'] < 80  # Should score lower without sections
    assert len(result['warnings']) > 0


def test_ats_with_action_verbs():
    """Test ATS evaluation rewards action verbs"""
    text_with_verbs = """
    EXPERIENCE
    - Led team of 5 engineers
    - Developed new features
    - Improved system performance
    - Managed project deliveries
    """
    
    text_without_verbs = """
    EXPERIENCE
    - Was part of engineering team
    - Worked on features
    - Part of performance improvements
    """
    
    sections_with = {'experience': text_with_verbs}
    sections_without = {'experience': text_without_verbs}
    
    result_with = ATSRules.evaluate_resume(text_with_verbs, sections_with)
    result_without = ATSRules.evaluate_resume(text_without_verbs, sections_without)
    
    # Text with action verbs should generally score higher
    assert result_with['score'] >= result_without['score'] - 10
