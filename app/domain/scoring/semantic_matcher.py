"""Semantic matching using TF-IDF and cosine similarity"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict
import numpy as np


class SemanticMatcher:
    """Semantic similarity matching between resume and job description"""
    
    @staticmethod
    def calculate_similarity(resume_text: str, job_text: str) -> Dict[str, float]:
        """Calculate semantic similarity using TF-IDF and cosine similarity"""
        try:
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=500,
                stop_words='english',
                ngram_range=(1, 2),  # unigrams and bigrams
                min_df=1
            )
            
            # Fit and transform both texts
            tfidf_matrix = vectorizer.fit_transform([resume_text, job_text])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            # Convert to percentage score
            score = similarity * 100
            
            # Get top terms from job description
            job_tfidf = tfidf_matrix[1].toarray()[0]
            feature_names = vectorizer.get_feature_names_out()
            top_indices = job_tfidf.argsort()[-10:][::-1]
            top_terms = [feature_names[i] for i in top_indices if job_tfidf[i] > 0]
            
            return {
                'score': float(score),
                'similarity': float(similarity),
                'top_job_terms': top_terms
            }
        except Exception as e:
            # Fallback if TF-IDF fails (e.g., too little text)
            return {
                'score': 0.0,
                'similarity': 0.0,
                'top_job_terms': [],
                'error': str(e)
            }
    
    @staticmethod
    def calculate_section_similarity(resume_sections: Dict[str, str], 
                                     job_text: str) -> Dict[str, float]:
        """Calculate similarity for each resume section against job description"""
        section_scores = {}
        
        for section_name, section_text in resume_sections.items():
            if section_text and len(section_text) > 50:
                result = SemanticMatcher.calculate_similarity(section_text, job_text)
                section_scores[section_name] = result['score']
        
        return section_scores
