"""Keyword matching for resume and job descriptions"""
import re
from typing import List, Dict, Set
from collections import Counter


class KeywordMatcher:
    """Match keywords between resume and job description"""
    
    # Stop words to exclude
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    }
    
    @staticmethod
    def extract_keywords(text: str, min_length: int = 3) -> List[str]:
        """Extract keywords from text"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep hyphens and periods in words
        text = re.sub(r'[^\w\s\-\.]', ' ', text)
        
        # Split into words
        words = text.split()
        
        # Filter out stop words and short words
        keywords = [
            word for word in words
            if len(word) >= min_length and word not in KeywordMatcher.STOP_WORDS
        ]
        
        return keywords
    
    @staticmethod
    def extract_important_phrases(text: str) -> List[str]:
        """Extract important noun phrases and compound terms"""
        phrases = []
        
        # Extract technical terms (usually capitalized or have special patterns)
        tech_pattern = r'\b[A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*\b'
        tech_terms = re.findall(tech_pattern, text)
        phrases.extend(tech_terms)
        
        # Extract hyphenated terms
        hyphenated = re.findall(r'\b\w+(?:-\w+)+\b', text)
        phrases.extend(hyphenated)
        
        # Extract version numbers (e.g., Python 3.8, Java 11)
        version_pattern = r'\b\w+\s+\d+(?:\.\d+)*\b'
        versions = re.findall(version_pattern, text, re.IGNORECASE)
        phrases.extend(versions)
        
        return [p.lower() for p in phrases if len(p) > 2]
    
    @staticmethod
    def calculate_keyword_overlap(resume_text: str, job_text: str) -> Dict[str, any]:
        """Calculate keyword overlap between resume and job description"""
        resume_keywords = KeywordMatcher.extract_keywords(resume_text)
        job_keywords = KeywordMatcher.extract_keywords(job_text)
        
        resume_phrases = KeywordMatcher.extract_important_phrases(resume_text)
        job_phrases = KeywordMatcher.extract_important_phrases(job_text)
        
        # Combine words and phrases
        resume_terms = set(resume_keywords + resume_phrases)
        job_terms = set(job_keywords + job_phrases)
        
        # Calculate overlap
        matched = resume_terms & job_terms
        missing = job_terms - resume_terms
        
        # Calculate frequency scores
        job_term_freq = Counter(job_keywords + job_phrases)
        important_missing = sorted(
            missing,
            key=lambda x: job_term_freq.get(x, 0),
            reverse=True
        )[:20]
        
        # Calculate score
        if len(job_terms) > 0:
            score = len(matched) / len(job_terms) * 100
        else:
            score = 0.0
        
        return {
            'score': min(score, 100.0),
            'matched': sorted(list(matched))[:30],
            'missing': list(important_missing),
            'total_resume_terms': len(resume_terms),
            'total_job_terms': len(job_terms),
            'matched_count': len(matched)
        }
    
    @staticmethod
    def weight_keywords_by_importance(keywords: List[str], text: str) -> Dict[str, float]:
        """Weight keywords by their importance (frequency and position)"""
        keyword_weights = {}
        text_lower = text.lower()
        
        # Count frequency
        for keyword in keywords:
            count = text_lower.count(keyword.lower())
            
            # Higher weight for terms that appear multiple times
            weight = min(count * 0.2, 1.0)
            
            # Boost weight if appears in first 200 characters (likely title/summary)
            if keyword.lower() in text_lower[:200]:
                weight += 0.3
            
            keyword_weights[keyword] = weight
        
        return keyword_weights
