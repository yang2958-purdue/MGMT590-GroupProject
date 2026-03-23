"""
Resume tailoring: rewrite resume to match job description using AI.
"""

SYSTEM_PROMPT = (
    "You are an expert resume writer. Rewrite the provided resume to better "
    "match the job description. Do not fabricate experience. Incorporate missing keywords "
    "naturally. Preserve the candidate's voice. Return only the resume text."
)


def tailor(resume: dict, posting: dict, ai_provider=None) -> dict:
    """
    Produce tailored resume text. If ai_provider is None, return original text.
    Returns dict with key tailored_text.
    """
    raw_text = resume.get("raw_text", "")
    description = posting.get("description", "")

    if not ai_provider:
        return {"tailored_text": raw_text}

    user_prompt = (
        "Resume:\n\n"
        f"{raw_text}\n\n"
        "Job description:\n\n"
        f"{description}\n\n"
        "Rewrite the resume above to better match the job description. Return only the resume text, no preamble."
    )
    try:
        tailored_text = ai_provider.complete(SYSTEM_PROMPT, user_prompt)
        tailored_text = (tailored_text or "").strip() or raw_text
    except Exception:
        tailored_text = raw_text

    return {"tailored_text": tailored_text}
