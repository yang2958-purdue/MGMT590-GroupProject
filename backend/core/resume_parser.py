"""
Parse resume files (PDF, DOCX, TXT) into structured ResumeData.
"""
import re
from pathlib import Path
from typing import TypedDict

from PyPDF2 import PdfReader
from docx import Document as DocxDocument


class ResumeData(TypedDict):
    raw_text: str
    skills: list[str]
    experience: list[str]
    education: list[str]
    filename: str


def _extract_text_pdf(content: bytes) -> str:
    """Extract text from PDF bytes."""
    import io
    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


def _extract_text_docx(content: bytes) -> str:
    """Extract text from DOCX bytes."""
    import io
    doc = DocxDocument(io.BytesIO(content))
    parts: list[str] = []
    # Regular paragraphs
    for p in doc.paragraphs:
        text = p.text.strip()
        if text:
            parts.append(text)
    # Table contents (many resumes put skills in table cells)
    for table in getattr(doc, "tables", []):
        for row in table.rows:
            for cell in row.cells:
                text = cell.text.strip()
                if text and text not in parts:
                    parts.append(text)
    return "\n".join(parts)


def _extract_text_txt(content: bytes) -> str:
    """Decode plain text."""
    return content.decode("utf-8", errors="replace")


def _extract_sections(raw_text: str) -> tuple[list[str], list[str], list[str]]:
    """
    Heuristic extraction of skills, experience, education from raw text.
    Looks for common section headers and bullet/keyword patterns.
    """
    text_lower = raw_text.lower()
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    skills: list[str] = []
    experience: list[str] = []
    education: list[str] = []

    # Common section headers
    skill_headers = ("skills", "technical skills", "core competencies", "expertise", "technologies")
    exp_headers = ("experience", "work experience", "employment", "professional experience")
    edu_headers = ("education", "academic", "qualifications", "degree")

    current_section: str | None = None
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if any(h in line_lower for h in skill_headers) and len(line) < 50:
            current_section = "skills"
            continue
        if any(h in line_lower for h in exp_headers) and len(line) < 50:
            current_section = "experience"
            continue
        if any(h in line_lower for h in edu_headers) and len(line) < 50:
            current_section = "education"
            continue

        if current_section == "skills":
            # Split on comma, semicolon, pipe, or newline-with-dash/bullet
            for part in re.split(r"[,;|]|\s*[-•]\s*", line):
                part = part.strip()
                if part and len(part) < 80 and part not in skills:
                    skills.append(part)
        elif current_section == "experience":
            if line and not line.lower().startswith(("education", "skills", "references")):
                experience.append(line[:500])
        elif current_section == "education":
            if line and not line.lower().startswith(("experience", "skills", "references")):
                education.append(line[:500])

    # Fallback: treat short comma-separated phrases as skills if no section found
    if not skills and "," in raw_text:
        for chunk in raw_text[:3000].split(","):
            chunk = chunk.strip()
            if 2 <= len(chunk) <= 60 and chunk not in skills:
                skills.append(chunk)
                if len(skills) >= 30:
                    break

    return (skills[:50], experience[:20], education[:10])


def parse_resume(content: bytes, filename: str) -> ResumeData:
    """
    Parse resume content by extension. Returns ResumeData with raw_text and
    extracted skills, experience, education.
    """
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        raw_text = _extract_text_pdf(content)
    elif ext in (".docx", ".doc"):
        raw_text = _extract_text_docx(content)
    elif ext == ".txt" or not ext:
        raw_text = _extract_text_txt(content)
    else:
        raw_text = _extract_text_txt(content)

    raw_text = raw_text.strip() or " "
    skills, experience, education = _extract_sections(raw_text)

    return {
        "raw_text": raw_text,
        "skills": skills,
        "experience": experience,
        "education": education,
        "filename": filename,
    }
