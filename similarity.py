"""
Similarity computation module using TF-IDF vectorization.
Computes similarity scores between resume and job descriptions.
"""

from typing import List, Dict, Tuple
import difflib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class SimilarityCalculator:
    """
    Calculates similarity between resume and job postings.
    Uses TF-IDF with cosine similarity, falls back to difflib if needed.
    """
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            lowercase=True,
            ngram_range=(1, 2)  # Use unigrams and bigrams
        )
    
    def compute_similarity_tfidf(
        self, 
        resume_text: str, 
        job_descriptions: List[str]
    ) -> List[float]:
        """
        Compute TF-IDF based cosine similarity scores.
        
        Args:
            resume_text: The user's resume text
            job_descriptions: List of job description texts
            
        Returns:
            List of similarity scores (0-1) for each job
        """
        try:
            if not resume_text or not job_descriptions:
                return [0.0] * len(job_descriptions)
            
            # Combine resume with all job descriptions
            documents = [resume_text] + job_descriptions
            
            # Compute TF-IDF matrix
            tfidf_matrix = self.vectorizer.fit_transform(documents)
            
            # First row is the resume, rest are job descriptions
            resume_vector = tfidf_matrix[0:1]
            job_vectors = tfidf_matrix[1:]
            
            # Compute cosine similarity
            similarities = cosine_similarity(resume_vector, job_vectors)
            
            # Flatten and convert to list
            scores = similarities.flatten().tolist()
            
            return scores
            
        except Exception as e:
            print(f"Warning: TF-IDF computation failed: {str(e)}")
            return [0.0] * len(job_descriptions)
    
    def compute_similarity_difflib(
        self, 
        resume_text: str, 
        job_descriptions: List[str]
    ) -> List[float]:
        """
        Fallback similarity using difflib's SequenceMatcher.
        
        Args:
            resume_text: The user's resume text
            job_descriptions: List of job description texts
            
        Returns:
            List of similarity scores (0-1) for each job
        """
        try:
            scores = []
            
            for job_desc in job_descriptions:
                # Use SequenceMatcher for similarity
                matcher = difflib.SequenceMatcher(None, resume_text, job_desc)
                score = matcher.ratio()
                scores.append(score)
            
            return scores
            
        except Exception as e:
            print(f"Warning: Difflib computation failed: {str(e)}")
            return [0.0] * len(job_descriptions)
    
    def compute_similarity(
        self, 
        resume_text: str, 
        job_descriptions: List[str],
        use_tfidf: bool = True
    ) -> List[float]:
        """
        Compute similarity with automatic fallback.
        
        Args:
            resume_text: The user's resume text
            job_descriptions: List of job description texts
            use_tfidf: Whether to try TF-IDF first (default True)
            
        Returns:
            List of similarity scores (0-1) for each job
        """
        if not job_descriptions:
            return []
        
        if use_tfidf:
            # Try TF-IDF first
            scores = self.compute_similarity_tfidf(resume_text, job_descriptions)
            
            # Check if TF-IDF succeeded
            if scores and any(score > 0 for score in scores):
                return scores
            
            # Fallback to difflib
            print("TF-IDF returned zero scores, using difflib fallback...")
            scores = self.compute_similarity_difflib(resume_text, job_descriptions)
        else:
            scores = self.compute_similarity_difflib(resume_text, job_descriptions)
        
        return scores
    
    def rank_jobs(
        self, 
        resume_text: str, 
        jobs: List[Dict[str, str]]
    ) -> List[Tuple[Dict[str, str], float]]:
        """
        Rank jobs by similarity to resume.
        
        Args:
            resume_text: The user's resume text
            jobs: List of job dictionaries with 'description' key
            
        Returns:
            List of (job, score) tuples sorted by score (descending)
        """
        if not jobs:
            return []
        
        # Extract descriptions
        descriptions = [job.get("description", "") for job in jobs]
        
        # Compute similarities
        scores = self.compute_similarity(resume_text, descriptions)
        
        # Pair jobs with scores
        job_scores = list(zip(jobs, scores))
        
        # Sort by score (descending)
        job_scores.sort(key=lambda x: x[1], reverse=True)
        
        return job_scores
    
    def get_top_keywords(
        self, 
        resume_text: str, 
        job_description: str, 
        top_n: int = 10
    ) -> List[str]:
        """
        Extract top overlapping keywords between resume and job.
        
        Args:
            resume_text: The user's resume text
            job_description: Job description text
            top_n: Number of top keywords to return
            
        Returns:
            List of top overlapping keywords
        """
        try:
            # Fit on both documents
            documents = [resume_text, job_description]
            tfidf_matrix = self.vectorizer.fit_transform(documents)
            
            # Get feature names (words)
            feature_names = self.vectorizer.get_feature_names_out()
            
            # Get TF-IDF scores for both documents
            resume_scores = tfidf_matrix[0].toarray().flatten()
            job_scores = tfidf_matrix[1].toarray().flatten()
            
            # Find words that appear in both (non-zero in both)
            common_mask = (resume_scores > 0) & (job_scores > 0)
            common_indices = np.where(common_mask)[0]
            
            if len(common_indices) == 0:
                return []
            
            # Get combined scores (product of both)
            combined_scores = resume_scores[common_indices] * job_scores[common_indices]
            
            # Sort by combined score
            top_indices = combined_scores.argsort()[-top_n:][::-1]
            
            # Get corresponding keywords
            keywords = [feature_names[common_indices[i]] for i in top_indices]
            
            return keywords
            
        except Exception as e:
            print(f"Warning: Keyword extraction failed: {str(e)}")
            return []


# Convenience function
def compute_similarity(
    resume_text: str, 
    job_descriptions: List[str]
) -> List[float]:
    """
    Convenience function to compute similarity without instantiating class.
    
    Args:
        resume_text: The user's resume text
        job_descriptions: List of job description texts
        
    Returns:
        List of similarity scores
    """
    calculator = SimilarityCalculator()
    return calculator.compute_similarity(resume_text, job_descriptions)

