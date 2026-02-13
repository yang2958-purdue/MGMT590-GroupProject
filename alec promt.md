You are a senior software engineer.

Build a minimal, modular CLI-based resume auto-fill bot with the following requirements.

========================================
PROJECT GOAL
========================================

Create a lightweight command-line tool that:

1. Accepts a user's resume as input (file upload or pasted text).
2. Accepts a list of target companies.
3. Accepts a desired job role (e.g., "Software Engineer Intern").
4. Searches job postings for each company based on the role.
5. Computes a similarity score between each job posting and the user's resume.
6. Ranks job postings by similarity score.
7. Displays ranked results in a clean CLI menu.
8. Allows exporting tailored resume text for selected postings.

The system must be bare-bones and modular. 
No login system. No database. No unnecessary features.

========================================
TECH STACK
========================================

Use Python.

Allowed libraries:
- requests
- beautifulsoup4
- scikit-learn (for TF-IDF similarity)
- numpy
- difflib (optional fallback similarity)
- argparse or simple CLI menu
- pathlib
- re

DO NOT add:
- Authentication
- Database
- Web framework
- Frontend UI
- Cloud deployment
- User accounts

========================================
CORE ARCHITECTURE
========================================

Use modular structure:

/project
    main.py
    resume_parser.py
    job_search.py
    similarity.py
    exporter.py
    utils.py

Keep functions small and testable.

========================================
CLI MENU FLOW
========================================

When program runs, show:

1. Upload or paste resume
2. Enter target companies (comma-separated)
3. Enter desired role
4. Run search
5. View ranked results
6. Export tailored resume
7. Exit

Menu should loop until user exits.

========================================
RESUME INPUT REQUIREMENTS
========================================

Support:
- .txt file
- pasted text

Error handling:
- If file not found → show clean message
- If file empty → prompt re-entry
- If resume < 100 characters → warn user

Add normalization:
- Strip extra whitespace
- Remove excessive formatting
- Convert to lowercase
- Remove special characters safely

Avoid brittle assumptions about resume format.
Do NOT rely on section headers like “Experience” or “Education”.

========================================
TARGET COMPANY INPUT
========================================

User enters comma-separated list.

Example:
Google, Stripe, Nvidia

Validation:
- Remove extra spaces
- Remove duplicates
- Ignore empty values
- If no valid companies → re-prompt

Do not assume formatting consistency.

========================================
JOB SEARCH MODULE
========================================

Implement a function:

search_jobs(company_name: str, role: str) -> list[dict]

Each result dict must contain:
{
    "company": str,
    "title": str,
    "description": str,
    "url": str
}

If real scraping is complex:
- Create a mock search layer with placeholder job descriptions.
- Keep it swappable for real APIs later.

Add error handling:
- If search fails → return empty list
- Do not crash program.

========================================
SIMILARITY METRIC
========================================

Use TF-IDF vectorization:
- Fit on resume + job descriptions
- Compute cosine similarity
- Return similarity score (0–1)

Sort results descending.

If TF-IDF fails:
- Fallback to difflib similarity.

Encapsulate logic in:
compute_similarity(resume_text, job_descriptions)

========================================
EXPORT FEATURE
========================================

When user selects a job:

Generate a “tailored resume summary” that:
- Highlights overlapping keywords
- Suggests bullet improvements
- Outputs a modified summary section only
- Does NOT hallucinate new experience

Export to:
- .txt file

========================================
ERROR HANDLING
========================================

Include:
- Try/except blocks
- Clean CLI feedback
- No stack traces printed to user
- Graceful handling of empty lists
- Graceful handling of invalid input types

========================================
CODE QUALITY REQUIREMENTS
========================================

- Clear comments
- Type hints
- No global state where avoidable
- Separation of concerns
- Ready for extension
- Keep code simple

========================================
EXTRA SAFETY FEATURES
========================================

Add:
- Input sanitization
- Length limits on resume text
- Basic protection against malformed company names
- Avoid assumptions about resume layout
- No hardcoded job sites

========================================
OUTPUT
========================================

Return complete working code for all modules.

Keep it minimal but functional.
Avoid unnecessary abstraction.
Do not overengineer.
Focus on clarity and extensibility.
