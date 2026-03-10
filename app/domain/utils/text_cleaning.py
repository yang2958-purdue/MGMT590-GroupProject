"""Text cleaning utilities"""
import re
from typing import List


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text"""
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)
    # Replace multiple newlines with double newline
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove trailing whitespace
    text = '\n'.join(line.rstrip() for line in text.split('\n'))
    return text.strip()


def remove_headers_footers(text: str) -> str:
    """Remove repeated headers and footers"""
    lines = text.split('\n')
    if len(lines) < 3:
        return text
    
    # Simple heuristic: remove lines that appear more than once
    line_counts = {}
    for line in lines:
        stripped = line.strip()
        if stripped and len(stripped) > 5:
            line_counts[stripped] = line_counts.get(stripped, 0) + 1
    
    # Keep only lines that appear once or contain important keywords
    important_keywords = {'experience', 'education', 'skills', 'summary', 'work', 'project'}
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append(line)
        elif line_counts.get(stripped, 0) == 1 or any(kw in stripped.lower() for kw in important_keywords):
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


def fix_line_breaks(text: str) -> str:
    """Fix broken line wraps"""
    lines = text.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        current_line = lines[i].strip()
        
        # Check if line ends mid-sentence (no punctuation and next line doesn't start with bullet/number)
        if i < len(lines) - 1:
            next_line = lines[i + 1].strip()
            if (current_line and 
                not current_line[-1] in '.!?:;' and 
                next_line and 
                not next_line[0] in '•●■▪-*' and 
                not next_line[0].isnumeric()):
                # Merge lines
                fixed_lines.append(current_line + ' ' + next_line)
                i += 2
                continue
        
        fixed_lines.append(current_line)
        i += 1
    
    return '\n'.join(fixed_lines)


def extract_email(text: str) -> str:
    """Extract email address from text"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else ""


def extract_phone(text: str) -> str:
    """Extract phone number from text"""
    phone_patterns = [
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        r'\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b',
        r'\b\+\d{1,3}[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b'
    ]
    
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def clean_resume_text(text: str) -> str:
    """Apply all cleaning operations to resume text"""
    text = normalize_whitespace(text)
    text = remove_headers_footers(text)
    text = fix_line_breaks(text)
    return text
