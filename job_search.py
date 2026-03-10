"""
Job search module for finding job postings.
Currently uses mock data but designed to be swappable with real APIs.
"""

from typing import List, Dict
import random


class JobSearcher:
    """
    Handles job search functionality.
    Currently provides mock data but can be extended with real scraping/APIs.
    """
    
    def __init__(self):
        # Mock job descriptions by category
        self.mock_descriptions = {
            "software_engineer": [
                "We are seeking a talented Software Engineer to join our team. You will design, develop, and maintain scalable software solutions. Required skills include Python, Java, or C++, experience with databases, and strong problem-solving abilities. Knowledge of cloud platforms (AWS, Azure, GCP) is a plus. You'll collaborate with cross-functional teams to deliver high-quality code.",
                "Join our engineering team as a Software Engineer. Responsibilities include writing clean code, participating in code reviews, and building distributed systems. Must have 2+ years experience with modern programming languages, understanding of data structures and algorithms, and familiarity with agile methodologies. Experience with microservices architecture preferred.",
                "Software Engineer position available for motivated developers. Work on cutting-edge projects using Python, JavaScript, and Go. Requirements include bachelor's degree in Computer Science or equivalent, strong coding skills, experience with RESTful APIs, version control (Git), and CI/CD pipelines. Excellent communication skills essential.",
            ],
            "intern": [
                "Software Engineering Intern opportunity for students pursuing Computer Science or related field. Gain hands-on experience building real products. You'll work with experienced engineers on meaningful projects. Required: currently enrolled in university, knowledge of at least one programming language (Python, Java, JavaScript), and passion for technology. Summer 10-12 week program.",
                "Internship position for aspiring software developers. Learn about software development lifecycle, participate in team meetings, write production code, and contribute to open-source projects. Seeking candidates with foundational programming knowledge, curiosity, and strong work ethic. All majors welcome. Mentorship provided.",
                "Join us as a Software Engineer Intern! Work on challenging problems in web development, mobile apps, or backend systems. Requirements: pursuing Bachelor's or Master's degree, basic understanding of data structures and algorithms, familiarity with Git. Experience with Python, React, or Node.js is beneficial. Collaborative environment.",
            ],
            "data_scientist": [
                "Data Scientist role focusing on machine learning and predictive analytics. You'll analyze large datasets, build ML models, and derive actionable insights. Required: Master's or PhD in quantitative field, proficiency in Python/R, experience with scikit-learn, TensorFlow, or PyTorch, strong statistical knowledge, and SQL expertise. Experience with A/B testing preferred.",
                "Seeking Data Scientist to join our analytics team. Responsibilities include data mining, statistical modeling, and presenting findings to stakeholders. Must have experience with pandas, NumPy, data visualization tools (Matplotlib, Tableau), and feature engineering. Knowledge of NLP and deep learning a plus. 3+ years industry experience required.",
            ],
            "devops": [
                "DevOps Engineer needed to manage infrastructure and deployment pipelines. Responsibilities include automating workflows, monitoring systems, and improving reliability. Required: experience with Docker, Kubernetes, Jenkins, Terraform, cloud platforms (AWS/GCP/Azure), Linux administration, and scripting (Bash/Python). Strong understanding of CI/CD principles.",
                "Join our SRE/DevOps team to build scalable infrastructure. You'll work with containerization, orchestration, and infrastructure as code. Must have experience with cloud services, configuration management tools (Ansible, Chef), monitoring solutions (Prometheus, Grafana), and networking fundamentals. On-call rotation required.",
            ],
            "frontend": [
                "Frontend Engineer position building beautiful user interfaces. Work with React, TypeScript, and modern CSS frameworks. Required: 3+ years JavaScript experience, expertise in responsive design, understanding of web performance optimization, and experience with state management (Redux, MobX). Design sensibility important.",
                "Seeking Frontend Developer to create engaging web applications. You'll collaborate with designers and backend teams. Must have strong HTML/CSS/JavaScript skills, experience with modern frameworks (React, Vue, or Angular), familiarity with RESTful APIs, and understanding of cross-browser compatibility. Portfolio required.",
            ]
        }
    
    def search_jobs(self, company_name: str, role: str) -> List[Dict[str, str]]:
        """
        Search for job postings at a specific company for a given role.
        Currently returns mock data but designed to be replaced with real scraping.
        
        Args:
            company_name: Name of the company
            role: Desired job role/title
            
        Returns:
            List of job dictionaries with keys: company, title, description, url
        """
        try:
            # Normalize role to match categories
            role_lower = role.lower()
            
            # Determine job category
            category = self._categorize_role(role_lower)
            
            # Get relevant descriptions
            descriptions = self.mock_descriptions.get(
                category, 
                self.mock_descriptions["software_engineer"]
            )
            
            # Generate 2-4 mock jobs for this company
            num_jobs = random.randint(2, 4)
            jobs = []
            
            for i in range(num_jobs):
                # Select description (with some variation)
                desc_idx = i % len(descriptions)
                description = descriptions[desc_idx]
                
                # Vary the title slightly
                title = self._generate_title(role, i)
                
                job = {
                    "company": company_name,
                    "title": title,
                    "description": description,
                    "url": f"https://{company_name.lower().replace(' ', '')}.com/careers/job-{i+1}"
                }
                
                jobs.append(job)
            
            return jobs
            
        except Exception as e:
            # Return empty list on error - don't crash
            print(f"Warning: Job search failed for {company_name}: {str(e)}")
            return []
    
    def _categorize_role(self, role: str) -> str:
        """
        Categorize a role string into predefined categories.
        
        Args:
            role: Role string (lowercase)
            
        Returns:
            Category key
        """
        if "intern" in role:
            return "intern"
        elif "data" in role or "scientist" in role or "analyst" in role or "ml" in role:
            return "data_scientist"
        elif "devops" in role or "sre" in role or "site reliability" in role:
            return "devops"
        elif "frontend" in role or "front-end" in role or "ui" in role:
            return "frontend"
        else:
            return "software_engineer"
    
    def _generate_title(self, base_role: str, variation: int) -> str:
        """
        Generate job title with slight variations.
        
        Args:
            base_role: Base role name
            variation: Variation index
            
        Returns:
            Job title string
        """
        levels = ["", "Junior ", "Mid-Level ", "Senior "]
        teams = ["", " - Backend", " - Full Stack", " - Platform", " - Infrastructure"]
        
        # Use variation to select different combinations
        if variation == 0:
            return base_role
        elif variation == 1:
            return levels[variation % len(levels)] + base_role
        elif variation == 2:
            return base_role + teams[variation % len(teams)]
        else:
            return levels[variation % len(levels)] + base_role + teams[variation % len(teams)]
    
    def search_multiple_companies(
        self, 
        companies: List[str], 
        role: str
    ) -> List[Dict[str, str]]:
        """
        Search for jobs across multiple companies.
        
        Args:
            companies: List of company names
            role: Desired job role
            
        Returns:
            Combined list of all job postings
        """
        all_jobs = []
        
        for company in companies:
            try:
                jobs = self.search_jobs(company, role)
                all_jobs.extend(jobs)
            except Exception as e:
                print(f"Warning: Failed to search jobs at {company}: {str(e)}")
                continue
        
        return all_jobs


# Function interface for easier testing
def search_jobs(company_name: str, role: str) -> List[Dict[str, str]]:
    """
    Convenience function to search jobs without instantiating class.
    
    Args:
        company_name: Name of the company
        role: Desired job role
        
    Returns:
        List of job dictionaries
    """
    searcher = JobSearcher()
    return searcher.search_jobs(company_name, role)

