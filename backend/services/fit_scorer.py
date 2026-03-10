"""
Fit scoring service - Scores job-resume fit using TF-IDF and Claude AI
"""
import os
import re
from typing import Dict, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import anthropic
import json


class FitScorer:
    """Scores how well a resume fits a job description"""
    
    def __init__(self):
        self.anthropic_client = None
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
        
        # Cache for scores to avoid repeat API calls
        self.score_cache = {}
    
    def score_fit(
        self,
        resume_text: str,
        job_description: str,
        use_ai: bool = False
    ) -> Dict:
        """
        Score resume-job fit
        
        Args:
            resume_text: Full resume text
            job_description: Job description text
            use_ai: Whether to use Claude AI (slower but better)
            
        Returns:
            Dictionary with score and analysis
        """
        # Check cache
        cache_key = self._generate_cache_key(resume_text, job_description, use_ai)
        if cache_key in self.score_cache:
            return self.score_cache[cache_key]
        
        if use_ai and self.anthropic_client:
            result = self._score_with_ai(resume_text, job_description)
        else:
            result = self._score_with_tfidf(resume_text, job_description)
        
        # Cache result
        self.score_cache[cache_key] = result
        return result
    
    def _score_with_tfidf(self, resume_text: str, job_description: str) -> Dict:
        """Fast scoring using TF-IDF cosine similarity"""
        # Clean and prepare texts
        resume_clean = self._clean_text(resume_text)
        job_clean = self._clean_text(job_description)
        
        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),  # unigrams and bigrams
            max_features=500
        )
        
        try:
            tfidf_matrix = vectorizer.fit_transform([resume_clean, job_clean])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            # Convert to 0-10 scale
            score = round(similarity * 10, 2)
            
            # Extract matching and missing skills
            matching_skills, missing_skills = self._extract_skill_gaps(
                resume_text, job_description
            )
            
            return {
                "score": score,
                "matching_skills": matching_skills,
                "missing_skills": missing_skills,
                "seniority_fit": None,
                "qualitative_analysis": f"TF-IDF similarity score: {similarity:.2%}",
                "method": "tfidf"
            }
        
        except Exception as e:
            # Fallback if TF-IDF fails
            return {
                "score": 5.0,
                "matching_skills": [],
                "missing_skills": [],
                "seniority_fit": None,
                "qualitative_analysis": f"Scoring failed: {str(e)}",
                "method": "tfidf"
            }
    
    def _score_with_ai(self, resume_text: str, job_description: str) -> Dict:
        """
        Detailed scoring using Claude AI
        Provides qualitative analysis and skill gap identification
        """
        prompt = f"""You are an expert recruiter analyzing how well a candidate's resume matches a job description.

RESUME:
{resume_text[:3000]}

JOB DESCRIPTION:
{job_description[:3000]}

Analyze the fit and provide a structured JSON response with:
1. overall_score: A score from 0-10 (10 = perfect fit)
2. matching_skills: List of skills/qualifications the candidate has that match the job (list of strings)
3. missing_skills: List of required skills the candidate lacks (list of strings)
4. seniority_fit: Whether the candidate's experience level matches (e.g., "Good fit - Senior level", "Underqualified - Entry level", "Overqualified")
5. qualitative_analysis: 2-3 sentence summary of the fit

Respond ONLY with valid JSON in this exact format:
{{
  "overall_score": 7.5,
  "matching_skills": ["Python", "Machine Learning", "AWS"],
  "missing_skills": ["Kubernetes", "Go"],
  "seniority_fit": "Good fit - Mid to Senior level",
  "qualitative_analysis": "Strong technical background with relevant ML experience. Missing some DevOps skills but otherwise well-aligned."
}}"""

        try:
            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text.strip()
            
            # Parse JSON response
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = re.sub(r'^```json?\s*|\s*```$', '', response_text, flags=re.MULTILINE)
            
            result = json.loads(response_text)
            
            return {
                "score": float(result.get("overall_score", 5.0)),
                "matching_skills": result.get("matching_skills", []),
                "missing_skills": result.get("missing_skills", []),
                "seniority_fit": result.get("seniority_fit"),
                "qualitative_analysis": result.get("qualitative_analysis"),
                "method": "ai"
            }
        
        except Exception as e:
            print(f"Claude AI scoring failed: {str(e)}")
            # Fallback to TF-IDF
            return self._score_with_tfidf(resume_text, job_description)
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for TF-IDF"""
        # Convert to lowercase
        text = text.lower()
        # Remove special characters but keep letters, numbers, spaces
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _extract_skill_gaps(
        self,
        resume_text: str,
        job_description: str
    ) -> Tuple[List[str], List[str]]:
        """
        Extract matching and missing skills using keyword matching
        This is a simple heuristic approach
        """
        # Common technical skills to check
        common_skills = [
            "python", "java", "javascript", "typescript", "react", "angular", "vue",
            "node.js", "django", "flask", "fastapi", "sql", "postgresql", "mongodb",
            "aws", "azure", "gcp", "docker", "kubernetes", "git", "agile", "scrum",
            "machine learning", "deep learning", "tensorflow", "pytorch", "rest api",
            "graphql", "microservices", "ci/cd", "jenkins", "terraform"
        ]
        
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()
        
        matching_skills = []
        missing_skills = []
        
        for skill in common_skills:
            in_resume = skill in resume_lower
            in_job = skill in job_lower
            
            if in_job:
                if in_resume:
                    matching_skills.append(skill.title())
                else:
                    missing_skills.append(skill.title())
        
        return matching_skills, missing_skills
    
    def _generate_cache_key(self, resume: str, job: str, use_ai: bool) -> str:
        """Generate cache key for scoring"""
        import hashlib
        content = f"{resume[:500]}{job[:500]}{use_ai}"
        return hashlib.md5(content.encode()).hexdigest()


# Singleton instance
fit_scorer = FitScorer()

