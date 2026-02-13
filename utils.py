"""
Utility functions for the resume auto-fill bot.
Provides common helpers for text normalization and validation.
"""

import re
from typing import List


def normalize_text(text: str) -> str:
    """
    Normalize text by removing extra whitespace and special characters.
    
    Args:
        text: Raw input text
        
    Returns:
        Normalized text string
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def sanitize_input(text: str, max_length: int = 50000) -> str:
    """
    Sanitize user input by removing potentially problematic characters
    and enforcing length limits.
    
    Args:
        text: User input text
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Enforce length limit
    if len(text) > max_length:
        text = text[:max_length]
    
    # Normalize
    text = normalize_text(text)
    
    return text


def parse_company_list(company_string: str) -> List[str]:
    """
    Parse comma-separated company list and validate.
    
    Args:
        company_string: Comma-separated company names
        
    Returns:
        List of valid company names
    """
    if not company_string:
        return []
    
    # Split by comma
    companies = company_string.split(',')
    
    # Clean and validate
    cleaned = []
    seen = set()
    
    for company in companies:
        # Strip whitespace
        company = company.strip()
        
        # Skip empty values
        if not company:
            continue
        
        # Remove duplicates (case-insensitive)
        company_lower = company.lower()
        if company_lower in seen:
            continue
        
        seen.add(company_lower)
        cleaned.append(company)
    
    return cleaned


def validate_resume_text(text: str, min_length: int = 100) -> tuple[bool, str]:
    """
    Validate resume text meets minimum requirements.
    
    Args:
        text: Resume text to validate
        min_length: Minimum character count
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not text:
        return False, "Resume text is empty"
    
    if len(text.strip()) < min_length:
        return False, f"Resume is too short (minimum {min_length} characters)"
    
    return True, ""


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to maximum length with suffix.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to append if truncated
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def safe_filename(text: str, max_length: int = 50) -> str:
    """
    Convert text to safe filename.
    
    Args:
        text: Text to convert
        max_length: Maximum filename length
        
    Returns:
        Safe filename string
    """
    # Remove or replace unsafe characters
    safe = re.sub(r'[<>:"/\\|?*]', '_', text)
    
    # Remove extra whitespace
    safe = re.sub(r'\s+', '_', safe)
    
    # Truncate to max length
    safe = safe[:max_length]
    
    # Remove leading/trailing underscores
    safe = safe.strip('_')
    
    return safe if safe else "output"

