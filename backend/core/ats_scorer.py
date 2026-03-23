"""
ATS keyword match score: extract keywords from job description, count matches in resume.
Returns score 0.0-100.0 and matched/missing keyword lists.
"""
import re
import string


# Simple English stopwords
_STOP = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "been", "be",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
    "this", "that", "these", "those", "it", "its", "we", "our", "you", "your",
    "they", "them", "their", "he", "she", "his", "her", "they", "experience",
    "required", "preferred", "ability", "responsibilities", "qualifications",
}


def _tokenize(text: str) -> list[str]:
    """Lowercase, remove punctuation, split on whitespace."""
    text = text.lower()
    for c in string.punctuation:
        text = text.replace(c, " ")
    return [w for w in text.split() if w and len(w) > 1]


def _extract_keywords(description: str, max_keywords: int = 150) -> list[str]:
    """
    Extract candidate keywords: multi-word phrases (2-3 words) and single
    terms that are not stopwords. Prefer longer and technical-looking terms.
    """
    tokens = _tokenize(description)
    seen: set[str] = set()
    keywords: list[str] = []

    # Multi-word sequences (2-3 words)
    for n in (3, 2):
        for i in range(len(tokens) - n + 1):
            phrase = " ".join(tokens[i : i + n])
            if phrase not in seen and not any(w in _STOP for w in tokens[i : i + n]):
                seen.add(phrase)
                keywords.append(phrase)
                if len(keywords) >= max_keywords:
                    return keywords

    # Single words: skip stopwords, prefer longer
    for w in tokens:
        if w in seen or w in _STOP or len(w) < 3:
            continue
        seen.add(w)
        keywords.append(w)
        if len(keywords) >= max_keywords:
            break

    return keywords


def score_ats(
    resume_raw_text: str, posting_description: str
) -> tuple[float, list[str], list[str]]:
    """
    Extract keywords from job description; count how many appear in resume.
    Return (score_0_100, matched_keywords, missing_keywords).
    """
    keywords = _extract_keywords(posting_description)
    if not keywords:
        return (0.0, [], [])

    resume_lower = resume_raw_text.lower()
    matched: list[str] = []
    missing: list[str] = []

    for kw in keywords:
        # Prefer whole-word/phrase match
        if kw in resume_lower:
            matched.append(kw)
        else:
            # Single word: allow as substring for technical terms
            if " " not in kw and kw in resume_lower:
                matched.append(kw)
            else:
                missing.append(kw)

    score = (len(matched) / len(keywords)) * 100.0 if keywords else 0.0
    return (round(min(100.0, score), 1), matched, missing)
