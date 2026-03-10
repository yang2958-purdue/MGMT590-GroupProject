# Project Prompts Log

## 2026-02-13 - Resume Auto-Fill Bot Project

**Prompt:**
Build a minimal, modular CLI-based resume auto-fill bot with the following requirements:

**PROJECT GOAL:**
- Create a lightweight command-line tool that accepts a user's resume, target companies, and desired job role
- Search job postings for each company based on the role
- Compute similarity score between each job posting and the user's resume using TF-IDF
- Rank job postings by similarity score
- Display ranked results in a clean CLI menu
- Allow exporting tailored resume text for selected postings

**TECH STACK:**
- Python with requests, beautifulsoup4, scikit-learn, numpy, difflib, argparse, pathlib, re
- No authentication, database, web framework, frontend UI, cloud deployment, or user accounts

**ARCHITECTURE:**
- Modular structure: main.py, resume_parser.py, job_search.py, similarity.py, exporter.py, utils.py
- Keep functions small and testable
- Clear separation of concerns

**KEY FEATURES:**
- Resume input (file upload or pasted text)
- Target company input (comma-separated)
- Job role specification
- TF-IDF similarity scoring with difflib fallback
- Ranked job results display
- Tailored resume export feature
- Comprehensive error handling
- Type hints and clear documentation

