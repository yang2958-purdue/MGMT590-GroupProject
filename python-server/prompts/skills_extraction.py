# Tune ATS/skill-extraction behavior here without editing server.py.

SKILLS_JSON_SYSTEM = (
    "You extract employable skills from text for ATS-style matching. "
    "Respond with a single JSON object only (no markdown, no commentary). "
    'The object must have exactly one key: "skills", whose value is an array of strings.'
)

SKILLS_JSON_USER_RESUME = """From the resume text below, list concrete skills, technologies, tools, frameworks, languages, certifications, and methodologies the candidate demonstrates.

Include:
- Programming languages, frameworks, libraries, cloud platforms, databases, DevOps tools
- Domain-specific skills (e.g. machine learning, financial modeling) when clearly stated
- Named certifications (e.g. AWS Solutions Architect, PMP)

Exclude:
- Generic business words (e.g. industry, vertical, stakeholder, synergy, big, small) unless they are part of a standard skill phrase
- Soft skills unless tied to a specific method (e.g. Agile, Scrum Master)
- Company names, school names, locations, dates, contact info
- Full sentences or bullet points — list short phrases only (2–6 words max per item)

Deduplicate case-insensitively. Return at most 80 items. Return JSON only: {"skills": ["...", ...]}

Resume text:
"""

SKILLS_JSON_USER_JOB = """From the job description below, list the skills, technologies, tools, frameworks, languages, certifications, and methodologies the employer expects or prefers.

Include:
- Required and preferred technical skills explicitly mentioned
- Named certifications or licenses when relevant to the role

Exclude:
- Generic filler (e.g. industry, vertical, dynamic, fast-paced, big) unless part of a standard skill name
- Company names, benefits fluff, legal boilerplate
- Full sentences — short phrases only (2–6 words max per item)

Deduplicate case-insensitively. Return at most 80 items. Return JSON only: {"skills": ["...", ...]}

Job description:
"""
