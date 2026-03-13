"""Intelligent form field detection and mapping service"""
import logging
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FieldMapping:
    """Represents a mapped form field"""
    selector: str
    field_type: str  # 'input', 'textarea', 'select', 'checkbox', 'radio'
    resume_field: str  # Which resume data field to use
    confidence: float  # 0-1 confidence score
    input_type: Optional[str] = None  # e.g., 'text', 'email', 'tel'
    label: Optional[str] = None


class FieldMappingService:
    """Service for intelligent form field detection and mapping"""
    
    # Mapping patterns: regex patterns to match against various element attributes
    FIELD_PATTERNS = {
        # Personal Information
        'first_name': [
            r'first[_\s-]?name',
            r'fname',
            r'given[_\s-]?name',
            r'forename'
        ],
        'last_name': [
            r'last[_\s-]?name',
            r'lname',
            r'surname',
            r'family[_\s-]?name'
        ],
        'full_name': [
            r'^name$',
            r'full[_\s-]?name',
            r'your[_\s-]?name',
            r'applicant[_\s-]?name'
        ],
        'email': [
            r'e?mail',
            r'email[_\s-]?address',
            r'contact[_\s-]?email'
        ],
        'phone': [
            r'phone',
            r'telephone',
            r'mobile',
            r'cell',
            r'contact[_\s-]?number'
        ],
        'address': [
            r'address',
            r'street',
            r'location'
        ],
        'city': [
            r'city',
            r'town'
        ],
        'state': [
            r'state',
            r'province',
            r'region'
        ],
        'zip': [
            r'zip',
            r'postal[_\s-]?code',
            r'postcode'
        ],
        'country': [
            r'country'
        ],
        
        # Professional Information
        'linkedin': [
            r'linkedin',
            r'linked[_\s-]?in',
            r'linkedin[_\s-]?url',
            r'profile[_\s-]?url'
        ],
        'website': [
            r'website',
            r'portfolio',
            r'personal[_\s-]?site',
            r'github',
            r'blog'
        ],
        'current_company': [
            r'current[_\s-]?company',
            r'employer',
            r'organization'
        ],
        'current_title': [
            r'current[_\s-]?title',
            r'job[_\s-]?title',
            r'position',
            r'role'
        ],
        'years_experience': [
            r'years[_\s-]?(of[_\s-]?)?experience',
            r'experience[_\s-]?years',
            r'total[_\s-]?experience'
        ],
        
        # Education
        'education_level': [
            r'education[_\s-]?level',
            r'highest[_\s-]?degree',
            r'degree',
            r'qualification'
        ],
        'university': [
            r'university',
            r'college',
            r'school',
            r'institution'
        ],
        'major': [
            r'major',
            r'field[_\s-]?of[_\s-]?study',
            r'concentration',
            r'specialization'
        ],
        'graduation_year': [
            r'graduation[_\s-]?year',
            r'grad[_\s-]?year',
            r'year[_\s-]?graduated'
        ],
        
        # Application Specifics
        'cover_letter': [
            r'cover[_\s-]?letter',
            r'motivation',
            r'why[_\s-]?apply',
            r'interest'
        ],
        'resume_upload': [
            r'resume',
            r'cv',
            r'curriculum[_\s-]?vitae',
            r'upload[_\s-]?resume'
        ],
        'start_date': [
            r'start[_\s-]?date',
            r'available[_\s-]?from',
            r'availability'
        ],
        'salary_expectation': [
            r'salary',
            r'compensation',
            r'expected[_\s-]?salary',
            r'pay[_\s-]?range'
        ],
        'work_authorization': [
            r'work[_\s-]?authorization',
            r'authorized[_\s-]?to[_\s-]?work',
            r'visa[_\s-]?status',
            r'sponsorship'
        ],
        'how_heard': [
            r'how[_\s-]?(did[_\s-]?you[_\s-]?)?hear',
            r'referral',
            r'source'
        ]
    }
    
    @staticmethod
    def detect_field_type(element_attrs: Dict) -> str:
        """Determine the semantic field type from element attributes"""
        tag = element_attrs.get('tag', '')
        input_type = element_attrs.get('type', '')
        name = (element_attrs.get('name') or '').lower()
        id_attr = (element_attrs.get('id') or '').lower()
        placeholder = (element_attrs.get('placeholder') or '').lower()
        aria_label = (element_attrs.get('aria_label') or '').lower()
        
        # Combine all text attributes for matching
        combined_text = f"{name} {id_attr} {placeholder} {aria_label}"
        
        # Try to match against known patterns
        best_match = None
        best_score = 0
        
        for field_type, patterns in FieldMappingService.FIELD_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, combined_text, re.IGNORECASE):
                    # Calculate confidence score based on match quality
                    score = FieldMappingService._calculate_match_score(
                        pattern, combined_text, element_attrs
                    )
                    if score > best_score:
                        best_score = score
                        best_match = field_type
        
        return best_match or 'unknown'
    
    @staticmethod
    def _calculate_match_score(pattern: str, text: str, attrs: Dict) -> float:
        """Calculate confidence score for a pattern match"""
        score = 0.5  # Base score for any match
        
        # Higher score for matches in name/id (more reliable)
        name = (attrs.get('name') or '').lower()
        id_attr = (attrs.get('id') or '').lower()
        
        if re.search(pattern, name, re.IGNORECASE):
            score += 0.3
        if re.search(pattern, id_attr, re.IGNORECASE):
            score += 0.2
        
        # Bonus for required fields
        if attrs.get('required'):
            score += 0.1
        
        # Bonus for exact match
        if pattern == text.strip():
            score += 0.2
        
        return min(score, 1.0)
    
    @staticmethod
    def map_fields(elements: List) -> List[FieldMapping]:
        """Map form elements to resume fields"""
        mappings = []
        
        for element in elements:
            try:
                # Get element attributes
                attrs = {
                    'tag': element.evaluate('el => el.tagName').lower(),
                    'type': element.get_attribute('type'),
                    'name': element.get_attribute('name'),
                    'id': element.get_attribute('id'),
                    'placeholder': element.get_attribute('placeholder'),
                    'aria_label': element.get_attribute('aria-label'),
                    'required': element.get_attribute('required') is not None,
                }
                
                # Detect field type
                resume_field = FieldMappingService.detect_field_type(attrs)
                
                # Skip unknown fields with low confidence
                if resume_field == 'unknown':
                    continue
                
                # Build selector (prefer ID, then name, then other attributes)
                selector = FieldMappingService._build_selector(attrs)
                
                if selector:
                    mapping = FieldMapping(
                        selector=selector,
                        field_type=attrs['tag'],
                        resume_field=resume_field,
                        confidence=0.8 if resume_field != 'unknown' else 0.3,
                        input_type=attrs.get('type'),
                        label=attrs.get('aria_label') or attrs.get('placeholder')
                    )
                    mappings.append(mapping)
                    logger.debug(f"Mapped field: {resume_field} -> {selector}")
                
            except Exception as e:
                logger.debug(f"Failed to process element: {e}")
                continue
        
        return mappings
    
    @staticmethod
    def _build_selector(attrs: Dict) -> str:
        """Build a reliable CSS selector for an element"""
        # Prefer ID selector (most reliable)
        if attrs.get('id'):
            return f"#{attrs['id']}"
        
        # Then name attribute
        if attrs.get('name'):
            tag = attrs.get('tag', 'input')
            return f"{tag}[name='{attrs['name']}']"
        
        # Fallback to type + placeholder/aria-label
        if attrs.get('type'):
            selector = f"{attrs.get('tag', 'input')}[type='{attrs['type']}']"
            if attrs.get('placeholder'):
                selector += f"[placeholder*='{attrs['placeholder'][:20]}']"
            return selector
        
        return ""
    
    @staticmethod
    def get_resume_value(resume, field_name: str) -> Optional[str]:
        """Extract value from resume object for a given field"""
        # Extract personal info from resume text or structured data
        field_extractors = {
            'first_name': lambda r: FieldMappingService._extract_name(r)[0],
            'last_name': lambda r: FieldMappingService._extract_name(r)[1],
            'full_name': lambda r: ' '.join(FieldMappingService._extract_name(r)),
            'email': lambda r: FieldMappingService._extract_email(r),
            'phone': lambda r: FieldMappingService._extract_phone(r),
            'years_experience': lambda r: str(int(r.experience_years)) if r.experience_years else "",
            'education_level': lambda r: FieldMappingService._extract_degree_level(r),
            'university': lambda r: FieldMappingService._extract_university(r),
            'linkedin': lambda r: FieldMappingService._extract_linkedin(r),
        }
        
        extractor = field_extractors.get(field_name)
        if extractor:
            try:
                return extractor(resume)
            except Exception as e:
                logger.debug(f"Failed to extract {field_name}: {e}")
        
        return None
    
    @staticmethod
    def _extract_name(resume) -> Tuple[str, str]:
        """Extract first and last name from resume"""
        text = resume.cleaned_text[:500]
        
        # Try to find name in first few lines
        lines = text.split('\n')
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 3 and len(line) < 50:
                words = line.split()
                if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                    return words[0], words[-1]
        
        return "", ""
    
    @staticmethod
    def _extract_email(resume) -> str:
        """Extract email from resume"""
        from app.domain.utils.text_cleaning import extract_email
        return extract_email(resume.cleaned_text)
    
    @staticmethod
    def _extract_phone(resume) -> str:
        """Extract phone from resume"""
        from app.domain.utils.text_cleaning import extract_phone
        return extract_phone(resume.cleaned_text)
    
    @staticmethod
    def _extract_degree_level(resume) -> str:
        """Extract highest degree level"""
        if not resume.education:
            return ""
        
        education_text = ' '.join(resume.education).lower()
        
        if 'phd' in education_text or 'doctorate' in education_text:
            return "Doctorate"
        elif 'master' in education_text or 'mba' in education_text:
            return "Master's Degree"
        elif 'bachelor' in education_text:
            return "Bachelor's Degree"
        elif 'associate' in education_text:
            return "Associate's Degree"
        
        return "Bachelor's Degree"  # Default
    
    @staticmethod
    def _extract_university(resume) -> str:
        """Extract university name"""
        if not resume.education:
            return ""
        
        # Return first education entry (usually most recent/highest)
        return resume.education[0] if resume.education else ""
    
    @staticmethod
    def _extract_linkedin(resume) -> str:
        """Extract LinkedIn URL from resume"""
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        match = re.search(linkedin_pattern, resume.cleaned_text, re.IGNORECASE)
        return f"https://{match.group(0)}" if match else ""
