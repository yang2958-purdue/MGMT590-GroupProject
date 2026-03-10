"""ATS (Applicant Tracking System) scoring rules"""
from typing import List, Dict, Tuple
import re


class ATSRules:
    """ATS-friendly resume evaluation rules"""
    
    REQUIRED_SECTIONS = ['experience', 'education', 'skills']
    PREFERRED_SECTIONS = ['summary', 'certifications']
    
    @staticmethod
    def evaluate_resume(resume_text: str, sections: Dict[str, str]) -> Dict[str, any]:
        """Evaluate resume for ATS compatibility"""
        warnings = []
        strengths = []
        scores = {}
        
        # Check for required sections
        section_score = ATSRules._check_sections(sections, warnings, strengths)
        scores['section_headings'] = section_score
        
        # Check formatting
        format_score = ATSRules._check_formatting(resume_text, warnings, strengths)
        scores['formatting'] = format_score
        
        # Check bullet points quality
        bullet_score = ATSRules._check_bullets(resume_text, sections, warnings, strengths)
        scores['measurable_bullets'] = bullet_score
        
        # Check structure quality
        structure_score = ATSRules._check_structure(resume_text, warnings, strengths)
        scores['structure_quality'] = structure_score
        
        # Check keyword presence
        keyword_score = ATSRules._check_keyword_presence(resume_text, sections, warnings, strengths)
        scores['keyword_presence'] = keyword_score
        
        # Calculate overall ATS score
        from app.config.settings import Settings
        weights = Settings.ATS_WEIGHTS
        
        total_score = (
            scores['keyword_presence'] * weights['keyword_presence'] +
            scores['section_headings'] * weights['section_headings'] +
            scores['formatting'] * weights['formatting'] +
            scores['measurable_bullets'] * weights['measurable_bullets'] +
            scores['structure_quality'] * weights['structure_quality']
        )
        
        return {
            'score': min(total_score, 100.0),
            'component_scores': scores,
            'warnings': warnings,
            'strengths': strengths
        }
    
    @staticmethod
    def _check_sections(sections: Dict[str, str], warnings: List[str], 
                       strengths: List[str]) -> float:
        """Check if resume has required sections"""
        score = 0.0
        present_required = sum(1 for s in ATSRules.REQUIRED_SECTIONS if s in sections)
        
        if present_required == len(ATSRules.REQUIRED_SECTIONS):
            score = 100.0
            strengths.append("All required sections present")
        else:
            score = (present_required / len(ATSRules.REQUIRED_SECTIONS)) * 100
            missing = [s for s in ATSRules.REQUIRED_SECTIONS if s not in sections]
            warnings.append(f"Missing required sections: {', '.join(missing)}")
        
        # Bonus for preferred sections
        present_preferred = sum(1 for s in ATSRules.PREFERRED_SECTIONS if s in sections)
        if present_preferred > 0:
            score = min(score + (present_preferred * 5), 100.0)
        
        return score
    
    @staticmethod
    def _check_formatting(text: str, warnings: List[str], strengths: List[str]) -> float:
        """Check for ATS-friendly formatting"""
        score = 100.0
        
        # Check for tables (potential ATS issue)
        if re.search(r'\|[\s\w]+\|', text):
            warnings.append("Resume may contain tables which can confuse ATS")
            score -= 20
        
        # Check for unusual characters
        unusual_chars = re.findall(r'[^\w\s\-.,;:()\[\]/@#&]', text)
        if len(unusual_chars) > 20:
            warnings.append("Resume contains many unusual characters")
            score -= 15
        
        # Check for contact information
        has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text))
        
        if has_email and has_phone:
            strengths.append("Contact information clearly present")
        else:
            warnings.append("Missing or unclear contact information")
            score -= 10
        
        # Check line length (paragraphs vs bullets)
        lines = text.split('\n')
        long_lines = sum(1 for line in lines if len(line) > 200)
        if long_lines > 5:
            warnings.append("Resume has dense paragraphs; use bullet points instead")
            score -= 10
        else:
            strengths.append("Good use of concise formatting")
        
        return max(score, 0.0)
    
    @staticmethod
    def _check_bullets(text: str, sections: Dict[str, str], warnings: List[str],
                      strengths: List[str]) -> float:
        """Check quality of bullet points"""
        score = 70.0  # Base score
        
        # Extract bullet points
        bullet_pattern = r'^\s*[•●■▪\-\*]\s+(.+)$'
        bullets = []
        for line in text.split('\n'):
            match = re.match(bullet_pattern, line)
            if match:
                bullets.append(match.group(1))
        
        if len(bullets) < 3:
            warnings.append("Too few bullet points; add more detail to experience")
            return 40.0
        
        # Check for action verbs
        action_verbs = {
            'led', 'managed', 'developed', 'created', 'implemented', 'designed',
            'built', 'improved', 'increased', 'reduced', 'achieved', 'delivered',
            'coordinated', 'executed', 'launched', 'optimized', 'streamlined'
        }
        
        bullets_with_action = sum(
            1 for bullet in bullets
            if any(verb in bullet.lower() for verb in action_verbs)
        )
        
        if bullets_with_action > len(bullets) * 0.6:
            strengths.append("Strong action verbs in bullet points")
            score += 20
        else:
            warnings.append("Use more action verbs to start bullet points")
        
        # Check for measurable achievements (numbers)
        bullets_with_numbers = sum(1 for bullet in bullets if re.search(r'\d+', bullet))
        
        if bullets_with_numbers > len(bullets) * 0.4:
            strengths.append("Good use of quantifiable achievements")
            score += 10
        else:
            warnings.append("Add more measurable achievements with numbers")
        
        return min(score, 100.0)
    
    @staticmethod
    def _check_structure(text: str, warnings: List[str], strengths: List[str]) -> float:
        """Check overall resume structure"""
        score = 80.0
        
        # Check length
        word_count = len(text.split())
        if word_count < 200:
            warnings.append("Resume is too short; add more detail")
            score -= 30
        elif word_count > 1500:
            warnings.append("Resume may be too long; consider condensing")
            score -= 10
        else:
            strengths.append("Resume length is appropriate")
        
        # Check for dates
        date_pattern = r'\b\d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
        dates = re.findall(date_pattern, text, re.IGNORECASE)
        if len(dates) >= 2:
            strengths.append("Dates are present for chronology")
        else:
            warnings.append("Add dates to experience and education")
            score -= 15
        
        return max(score, 0.0)
    
    @staticmethod
    def _check_keyword_presence(text: str, sections: Dict[str, str],
                                warnings: List[str], strengths: List[str]) -> float:
        """Check for presence of important keywords in appropriate sections"""
        score = 60.0  # Base score
        
        text_lower = text.lower()
        
        # Check for skills section with keywords
        if 'skills' in sections:
            skills_text = sections['skills'].lower()
            # Count technical terms
            tech_keywords = ['python', 'java', 'javascript', 'sql', 'aws', 'azure',
                           'react', 'docker', 'kubernetes', 'api', 'git']
            found_tech = sum(1 for kw in tech_keywords if kw in skills_text)
            
            if found_tech >= 3:
                strengths.append("Good technical keyword coverage")
                score += 20
            else:
                warnings.append("Add more relevant technical skills")
        else:
            warnings.append("Skills section missing or not detected")
        
        # Check for industry-relevant terms
        if 'experience' in sections:
            exp_text = sections['experience'].lower()
            if len(exp_text) > 100:
                strengths.append("Detailed experience section")
                score += 20
        
        return min(score, 100.0)
