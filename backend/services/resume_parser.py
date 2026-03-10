"""
Resume parsing service - Extracts structured data from PDF, DOCX, and TXT files
"""
import re
import io
from typing import Dict, List, Optional, Tuple
from PyPDF2 import PdfReader
from docx import Document
import hashlib


class ResumeParser:
    """Parses resumes and extracts structured information"""
    
    # Common section headers (case-insensitive)
    SECTION_PATTERNS = {
        "skills": r"(?:^|\n)\s*(?:skills|technical skills|core competencies|expertise)[\s:]*\n",
        "experience": r"(?:^|\n)\s*(?:experience|work experience|professional experience|employment)[\s:]*\n",
        "education": r"(?:^|\n)\s*(?:education|academic background|qualifications)[\s:]*\n",
        "summary": r"(?:^|\n)\s*(?:summary|professional summary|profile|objective)[\s:]*\n",
    }
    
    # Common skills to extract
    COMMON_SKILLS = {
        "languages": ["python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin"],
        "frameworks": ["react", "angular", "vue", "django", "flask", "fastapi", "spring", "express", "node.js", "next.js"],
        "databases": ["sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb"],
        "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd"],
        "ml": ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision"],
        "tools": ["git", "jira", "agile", "scrum", "rest api", "graphql", "microservices"]
    }
    
    def __init__(self):
        self.all_skills = []
        for category in self.COMMON_SKILLS.values():
            self.all_skills.extend(category)
    
    def parse_file(self, file_content: bytes, filename: str) -> Dict:
        """
        Main entry point - detects file type and parses accordingly
        
        Args:
            file_content: Raw bytes of the file
            filename: Original filename with extension
            
        Returns:
            Dictionary with parsed resume data
        """
        # Detect file type
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            raw_text = self._parse_pdf(file_content)
        elif file_extension in ['docx', 'doc']:
            raw_text = self._parse_docx(file_content)
        elif file_extension == 'txt':
            raw_text = file_content.decode('utf-8', errors='ignore')
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
        
        # Extract structured data
        parsed_data = self._extract_structured_data(raw_text)
        
        # Generate unique ID
        resume_id = hashlib.md5(raw_text.encode()).hexdigest()[:16]
        
        return {
            "resume_id": resume_id,
            "filename": filename,
            "raw_text": raw_text,
            "skills": parsed_data["skills"],
            "experience_years": parsed_data["experience_years"],
            "education": parsed_data["education"],
            "parsed_sections": parsed_data["sections"]
        }
    
    def _parse_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    def _parse_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to parse DOCX: {str(e)}")
    
    def _extract_structured_data(self, text: str) -> Dict:
        """Extract structured information from raw text"""
        # Find sections
        sections = self._find_sections(text)
        
        # Extract skills
        skills = self._extract_skills(text, sections.get("skills", ""))
        
        # Extract experience years
        experience_years = self._extract_experience_years(text, sections.get("experience", ""))
        
        # Extract education
        education = self._extract_education(sections.get("education", ""))
        
        return {
            "skills": skills,
            "experience_years": experience_years,
            "education": education,
            "sections": sections
        }
    
    def _find_sections(self, text: str) -> Dict[str, str]:
        """Identify and extract different sections of the resume"""
        sections = {}
        text_lower = text.lower()
        
        # Find section boundaries
        section_positions = []
        for section_name, pattern in self.SECTION_PATTERNS.items():
            matches = list(re.finditer(pattern, text_lower, re.IGNORECASE | re.MULTILINE))
            for match in matches:
                section_positions.append((match.start(), section_name))
        
        # Sort by position
        section_positions.sort()
        
        # Extract text between sections
        for i, (start_pos, section_name) in enumerate(section_positions):
            if i < len(section_positions) - 1:
                end_pos = section_positions[i + 1][0]
            else:
                end_pos = len(text)
            
            sections[section_name] = text[start_pos:end_pos].strip()
        
        return sections
    
    def _extract_skills(self, full_text: str, skills_section: str) -> List[str]:
        """Extract skills from text"""
        found_skills = set()
        
        # Search in both full text and skills section
        search_text = (skills_section + " " + full_text).lower()
        
        for skill in self.all_skills:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, search_text):
                found_skills.add(skill.title())
        
        return sorted(list(found_skills))
    
    def _extract_experience_years(self, full_text: str, experience_section: str) -> Optional[int]:
        """Estimate years of experience from date ranges"""
        # Look for year patterns (e.g., "2018-2020", "2018 - Present")
        year_pattern = r'\b(19|20)\d{2}\b'
        years = re.findall(year_pattern, experience_section or full_text)
        
        if not years:
            return None
        
        # Convert to integers and find range
        year_ints = [int(y) for y in years]
        if len(year_ints) >= 2:
            # Assume current year if "present" is mentioned
            current_year = 2026 if "present" in (experience_section or full_text).lower() else max(year_ints)
            min_year = min(year_ints)
            return current_year - min_year
        
        return None
    
    def _extract_education(self, education_section: str) -> List[str]:
        """Extract education entries"""
        education = []
        
        # Common degree patterns
        degree_patterns = [
            r'\b(?:Bachelor|B\.S\.|B\.A\.|BS|BA)\s+(?:of\s+)?(?:Science|Arts)?\s+in\s+[\w\s]+',
            r'\b(?:Master|M\.S\.|M\.A\.|MS|MA|MBA)\s+(?:of\s+)?(?:Science|Arts|Business)?\s+in\s+[\w\s]+',
            r'\b(?:Ph\.?D\.?|Doctorate)\s+in\s+[\w\s]+',
        ]
        
        for pattern in degree_patterns:
            matches = re.findall(pattern, education_section, re.IGNORECASE)
            education.extend(matches)
        
        # If no structured degrees found, return cleaned lines
        if not education and education_section:
            lines = [line.strip() for line in education_section.split('\n') if line.strip()]
            # Take first 3 substantial lines
            education = [line for line in lines if len(line) > 10][:3]
        
        return education


# Singleton instance
resume_parser = ResumeParser()

