"""Tests for file parsers"""
import pytest
from app.infrastructure.parsers.text_parser import TextParser
from app.domain.utils.text_cleaning import clean_resume_text, normalize_whitespace


def test_text_parser_from_string():
    """Test parsing text from string"""
    text = "This is a test resume\n\nExperience:\nSoftware Engineer"
    result = TextParser.parse_from_string(text)
    assert result == text


def test_normalize_whitespace():
    """Test whitespace normalization"""
    text = "This   has    multiple   spaces\n\n\n\nand newlines"
    result = normalize_whitespace(text)
    assert "   " not in result
    assert "\n\n\n" not in result


def test_clean_resume_text():
    """Test resume text cleaning"""
    text = "Name:  John   Doe\n\n\n\nExperience:   Software  Engineer"
    result = clean_resume_text(text)
    assert result
    assert "  " not in result or result.count("  ") < text.count("  ")


def test_skill_extraction():
    """Test skill extraction"""
    from app.domain.utils.skill_extractor import extract_skills_from_text
    
    text = "I have experience with Python, JavaScript, React, and AWS."
    skills = extract_skills_from_text(text)
    
    assert "python" in skills
    assert "javascript" in skills
    assert "react" in skills
    assert "aws" in skills


def test_section_parsing():
    """Test resume section parsing"""
    from app.domain.utils.section_parser import parse_resume_sections
    
    text = """
    John Doe
    
    EXPERIENCE
    Software Engineer at Tech Corp
    
    EDUCATION
    BS in Computer Science
    
    SKILLS
    Python, Java, React
    """
    
    sections = parse_resume_sections(text)
    assert 'experience' in sections
    assert 'education' in sections
    assert 'skills' in sections
