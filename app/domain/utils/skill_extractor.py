"""Skill extraction utilities"""
import re
from typing import List, Set, Dict


# Common technical skills and their variations
SKILL_MAPPINGS = {
    'python': ['python', 'py', 'python3'],
    'javascript': ['javascript', 'js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['typescript', 'ts'],
    'java': ['java', 'java8', 'java11', 'java17'],
    'c++': ['c++', 'cpp', 'cplusplus'],
    'c#': ['c#', 'csharp', 'c sharp'],
    'go': ['go', 'golang'],
    'rust': ['rust'],
    'ruby': ['ruby', 'rb'],
    'php': ['php'],
    'swift': ['swift'],
    'kotlin': ['kotlin'],
    'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'],
    'nosql': ['nosql', 'mongodb', 'cassandra', 'dynamodb', 'redis'],
    'react': ['react', 'reactjs', 'react.js'],
    'angular': ['angular', 'angularjs'],
    'vue': ['vue', 'vuejs', 'vue.js'],
    'node.js': ['node', 'nodejs', 'node.js'],
    'django': ['django'],
    'flask': ['flask'],
    'fastapi': ['fastapi', 'fast api'],
    'spring': ['spring', 'spring boot', 'springboot'],
    'docker': ['docker', 'containerization'],
    'kubernetes': ['kubernetes', 'k8s'],
    'aws': ['aws', 'amazon web services'],
    'azure': ['azure', 'microsoft azure'],
    'gcp': ['gcp', 'google cloud', 'google cloud platform'],
    'git': ['git', 'github', 'gitlab', 'bitbucket'],
    'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
    'jenkins': ['jenkins'],
    'terraform': ['terraform'],
    'ansible': ['ansible'],
    'linux': ['linux', 'unix'],
    'machine learning': ['machine learning', 'ml', 'deep learning', 'dl'],
    'ai': ['ai', 'artificial intelligence'],
    'data science': ['data science', 'data analysis', 'analytics'],
    'pandas': ['pandas'],
    'numpy': ['numpy'],
    'tensorflow': ['tensorflow'],
    'pytorch': ['pytorch'],
    'scikit-learn': ['scikit-learn', 'sklearn'],
    'api': ['api', 'rest', 'restful', 'graphql'],
    'agile': ['agile', 'scrum', 'kanban'],
    'testing': ['testing', 'unit testing', 'integration testing', 'tdd', 'test-driven development'],
    'html': ['html', 'html5'],
    'css': ['css', 'css3', 'sass', 'scss', 'less'],
}


def normalize_skill(skill: str) -> str:
    """Normalize a skill to its canonical form"""
    skill_lower = skill.lower().strip()
    
    for canonical, variations in SKILL_MAPPINGS.items():
        if skill_lower in variations:
            return canonical
    
    return skill_lower


def extract_skills_from_text(text: str) -> List[str]:
    """Extract skills from text using pattern matching"""
    skills = set()
    text_lower = text.lower()
    
    # Check for each known skill
    for canonical, variations in SKILL_MAPPINGS.items():
        for variation in variations:
            # Use word boundaries for better matching
            pattern = r'\b' + re.escape(variation) + r'\b'
            if re.search(pattern, text_lower, re.IGNORECASE):
                skills.add(canonical)
                break
    
    return sorted(list(skills))


def extract_skills_from_section(skills_section: str) -> List[str]:
    """Extract skills from a dedicated skills section"""
    if not skills_section:
        return []
    
    skills = set()
    
    # Split by common delimiters
    delimiters = [',', '|', '•', '●', '■', '▪', '\n']
    skill_list = [skills_section]
    
    for delimiter in delimiters:
        new_list = []
        for item in skill_list:
            new_list.extend(item.split(delimiter))
        skill_list = new_list
    
    # Clean and normalize each skill
    for skill_text in skill_list:
        skill_text = skill_text.strip()
        # Remove common prefixes
        skill_text = re.sub(r'^[-•●■▪*]\s*', '', skill_text)
        
        if skill_text and len(skill_text) > 1:
            normalized = normalize_skill(skill_text)
            skills.add(normalized)
    
    return sorted(list(skills))


def match_skills(resume_skills: List[str], job_skills: List[str]) -> Dict[str, List[str]]:
    """Match resume skills against job requirements"""
    resume_normalized = {normalize_skill(s) for s in resume_skills}
    job_normalized = {normalize_skill(s) for s in job_skills}
    
    matched = list(resume_normalized & job_normalized)
    missing = list(job_normalized - resume_normalized)
    
    return {
        'matched': sorted(matched),
        'missing': sorted(missing)
    }


def extract_certifications(text: str) -> List[str]:
    """Extract certifications from text"""
    certifications = []
    
    # Common certification patterns
    cert_patterns = [
        r'\b(AWS|Azure|GCP)\s+Certified\s+[\w\s]+',
        r'\bCertified\s+[\w\s]+Professional\b',
        r'\b(PMP|CISSP|CCNA|CCNP|CEH|CompTIA)\b',
        r'\b[\w\s]+Certification\b'
    ]
    
    for pattern in cert_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        certifications.extend(matches)
    
    return list(set(certifications))


def extract_education_degrees(text: str) -> List[str]:
    """Extract education degrees from text"""
    degrees = []
    
    degree_patterns = [
        r'\b(Bachelor|B\.S\.|B\.A\.|BS|BA)[\s\w]*',
        r'\b(Master|M\.S\.|M\.A\.|MS|MA|MBA)[\s\w]*',
        r'\b(Ph\.?D\.?|Doctorate)[\s\w]*',
        r'\b(Associate|A\.S\.|A\.A\.|AS|AA)[\s\w]*'
    ]
    
    for pattern in degree_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        degrees.extend(matches)
    
    return list(set(degrees))
