"""Resume section parsing utilities"""
import re
from typing import Dict, List, Tuple


# Common section heading patterns
SECTION_PATTERNS = {
    'summary': [
        r'^\s*(professional\s+)?summary\s*$',
        r'^\s*profile\s*$',
        r'^\s*objective\s*$',
        r'^\s*about\s+(me)?\s*$'
    ],
    'experience': [
        r'^\s*(work\s+)?experience\s*$',
        r'^\s*employment(\s+history)?\s*$',
        r'^\s*professional\s+experience\s*$',
        r'^\s*work\s+history\s*$'
    ],
    'education': [
        r'^\s*education\s*$',
        r'^\s*academic\s+background\s*$',
        r'^\s*educational\s+background\s*$'
    ],
    'skills': [
        r'^\s*(technical\s+)?skills\s*$',
        r'^\s*competencies\s*$',
        r'^\s*expertise\s*$',
        r'^\s*core\s+skills\s*$'
    ],
    'certifications': [
        r'^\s*certifications?\s*$',
        r'^\s*licenses?\s+(and\s+certifications?)?\s*$',
        r'^\s*professional\s+certifications?\s*$'
    ],
    'projects': [
        r'^\s*projects?\s*$',
        r'^\s*key\s+projects?\s*$',
        r'^\s*notable\s+projects?\s*$'
    ],
    'awards': [
        r'^\s*awards?\s+(and\s+honors?)?\s*$',
        r'^\s*achievements?\s*$',
        r'^\s*honors?\s*$'
    ]
}


def detect_section_heading(line: str) -> str:
    """Detect if a line is a section heading and return section type"""
    line_lower = line.lower().strip()
    
    for section_type, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            if re.match(pattern, line_lower, re.IGNORECASE):
                return section_type
    
    return ""


def parse_resume_sections(text: str) -> Dict[str, str]:
    """Parse resume text into sections"""
    lines = text.split('\n')
    sections = {}
    current_section = None
    current_content = []
    
    for line in lines:
        section_type = detect_section_heading(line)
        
        if section_type:
            # Save previous section
            if current_section and current_content:
                sections[current_section] = '\n'.join(current_content).strip()
            
            # Start new section
            current_section = section_type
            current_content = []
        elif current_section:
            current_content.append(line)
    
    # Save last section
    if current_section and current_content:
        sections[current_section] = '\n'.join(current_content).strip()
    
    return sections


def extract_bullet_points(text: str) -> List[str]:
    """Extract bullet points from text"""
    bullets = []
    bullet_pattern = r'^\s*[•●■▪\-\*]\s+(.+)$'
    
    for line in text.split('\n'):
        match = re.match(bullet_pattern, line)
        if match:
            bullets.append(match.group(1).strip())
    
    return bullets


def extract_dates(text: str) -> List[str]:
    """Extract date ranges from text"""
    date_patterns = [
        r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–—]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',
        r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–—]\s*Present\b',
        r'\b\d{4}\s*[-–—]\s*\d{4}\b',
        r'\b\d{4}\s*[-–—]\s*Present\b',
        r'\b\d{1,2}/\d{4}\s*[-–—]\s*\d{1,2}/\d{4}\b',
        r'\b\d{1,2}/\d{4}\s*[-–—]\s*Present\b'
    ]
    
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Handle tuples from groups
            for match in matches:
                if isinstance(match, tuple):
                    dates.extend([m for m in match if m])
                else:
                    dates.append(match)
    
    return dates


def estimate_experience_years(text: str) -> float:
    """Estimate years of experience from resume text"""
    dates = extract_dates(text)
    
    if not dates:
        return 0.0
    
    # Simple heuristic: count date ranges
    total_years = 0.0
    year_pattern = r'\b(\d{4})\b'
    
    for date_str in dates:
        years = re.findall(year_pattern, str(date_str))
        if len(years) >= 2:
            try:
                start_year = int(years[0])
                end_year = int(years[-1]) if 'present' not in date_str.lower() else 2024
                total_years += max(0, end_year - start_year)
            except (ValueError, IndexError):
                pass
    
    return min(total_years, 50.0)  # Cap at 50 years
