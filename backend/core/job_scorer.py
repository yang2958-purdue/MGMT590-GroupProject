"""
TF-IDF cosine similarity between resume and job description. Returns fit score 0.0-10.0.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np


def score_fit(resume_raw_text: str, posting_description: str) -> float:
    """
    Compute cosine similarity between resume and job description using TF-IDF.
    Scale from [0, 1] to [0, 10]. Returns 0.0 if either text is empty.
    """
    if not (resume_raw_text or posting_description):
        return 0.0
    if not resume_raw_text.strip() or not posting_description.strip():
        return 0.0
    vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
    try:
        matrix = vectorizer.fit_transform([resume_raw_text, posting_description])
    except Exception:
        return 0.0
    vecs = matrix.toarray()
    if vecs.shape[0] < 2:
        return 0.0
    a, b = vecs[0], vecs[1]
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    cosine = np.dot(a, b) / (norm_a * norm_b)
    cosine = float(np.clip(cosine, 0.0, 1.0))
    return round(cosine * 10.0, 1)
