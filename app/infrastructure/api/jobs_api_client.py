"""Jobs API client"""
import requests
from typing import List, Optional, Dict
from app.config.settings import Settings
from app.config.endpoints import JobsAPIEndpoints
from app.infrastructure.api.schemas import JobListingResponse, JobsListResponse
from app.domain.models import JobListing


class JobsAPIClient:
    """Client for job listings API"""
    
    def __init__(self, base_url: Optional[str] = None, timeout: int = 30):
        self.base_url = base_url or Settings.JOBS_API_BASE_URL
        self.timeout = timeout
    
    def get_jobs(self, search: str = "", location: str = "", 
                 page: int = 1, limit: int = 20) -> List[JobListing]:
        """Fetch job listings from API"""
        try:
            params = {
                'search': search,
                'location': location,
                'page': page,
                'limit': limit
            }
            
            response = requests.get(
                JobsAPIEndpoints.get_jobs(),
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            jobs_response = JobsListResponse(**data)
            
            # Convert to domain models
            return [self._to_domain_model(job) for job in jobs_response.jobs]
            
        except requests.RequestException as e:
            # Return mock data as fallback
            return self._get_mock_jobs(search, location)
        except Exception as e:
            raise Exception(f"Failed to fetch jobs: {str(e)}")
    
    def get_job_details(self, job_id: str) -> JobListing:
        """Fetch detailed job information"""
        try:
            response = requests.get(
                JobsAPIEndpoints.get_job_details(job_id),
                timeout=self.timeout
            )
            
            response.raise_for_status()
            data = response.json()
            
            job_response = JobListingResponse(**data)
            return self._to_domain_model(job_response)
            
        except requests.RequestException:
            # Return mock job as fallback
            return self._get_mock_job_details(job_id)
        except Exception as e:
            raise Exception(f"Failed to fetch job details: {str(e)}")
    
    @staticmethod
    def _to_domain_model(job_response: JobListingResponse) -> JobListing:
        """Convert API response to domain model"""
        return JobListing(
            id=job_response.id,
            title=job_response.title,
            company=job_response.company,
            location=job_response.location,
            description=job_response.description,
            employment_type=job_response.employment_type,
            requirements=job_response.requirements,
            preferred_qualifications=job_response.preferred_qualifications,
            skills=job_response.skills,
            posted_date=job_response.posted_date,
            salary_range=job_response.salary_range
        )
    
    @staticmethod
    def _get_mock_jobs(search: str = "", location: str = "") -> List[JobListing]:
        """Return mock job listings for testing"""
        mock_jobs = [
            JobListing(
                id="job_001",
                title="Senior Software Engineer",
                company="Tech Corp",
                location="San Francisco, CA",
                employment_type="Full-time",
                description="""We are seeking a Senior Software Engineer to join our growing team.
                You will be responsible for designing, developing, and maintaining scalable web applications.
                Work with Python, React, and AWS to build innovative solutions.""",
                requirements=[
                    "5+ years of software development experience",
                    "Strong proficiency in Python and JavaScript",
                    "Experience with cloud platforms (AWS, Azure, or GCP)",
                    "Knowledge of microservices architecture",
                    "Bachelor's degree in Computer Science or related field"
                ],
                preferred_qualifications=[
                    "Experience with Docker and Kubernetes",
                    "Knowledge of CI/CD pipelines",
                    "Contributions to open-source projects"
                ],
                skills=["Python", "JavaScript", "React", "AWS", "Docker", "Kubernetes", "CI/CD"],
                posted_date="2024-02-01",
                salary_range="$120,000 - $180,000"
            ),
            JobListing(
                id="job_002",
                title="Data Scientist",
                company="Data Analytics Inc",
                location="Remote",
                employment_type="Full-time",
                description="""Join our data science team to build ML models and drive insights.
                Work with large datasets, develop predictive models, and collaborate with engineers.""",
                requirements=[
                    "3+ years of data science experience",
                    "Strong Python and SQL skills",
                    "Experience with machine learning frameworks",
                    "Master's degree in Statistics, Computer Science, or related field"
                ],
                preferred_qualifications=[
                    "Experience with deep learning",
                    "Knowledge of big data technologies"
                ],
                skills=["Python", "SQL", "Machine Learning", "TensorFlow", "Pandas", "Scikit-learn"],
                posted_date="2024-02-05",
                salary_range="$100,000 - $150,000"
            ),
            JobListing(
                id="job_003",
                title="Full Stack Developer",
                company="StartupXYZ",
                location="New York, NY",
                employment_type="Full-time",
                description="""Looking for a full stack developer to build modern web applications.
                You'll work across the entire stack using Node.js, React, and MongoDB.""",
                requirements=[
                    "3+ years of full stack development",
                    "Proficiency in JavaScript/TypeScript",
                    "Experience with React and Node.js",
                    "Understanding of RESTful APIs"
                ],
                preferred_qualifications=[
                    "Experience with GraphQL",
                    "Knowledge of agile methodologies"
                ],
                skills=["JavaScript", "TypeScript", "React", "Node.js", "MongoDB", "REST APIs"],
                posted_date="2024-02-08",
                salary_range="$90,000 - $130,000"
            ),
            JobListing(
                id="job_004",
                title="Senior Business Analyst",
                company="Global Consulting Group",
                location="Chicago, IL",
                employment_type="Full-time",
                description="""We are seeking an experienced Business Analyst to bridge the gap between business needs 
                and technology solutions. You will work with stakeholders to gather requirements, analyze business processes, 
                and drive data-driven decision making.""",
                requirements=[
                    "5+ years of business analysis experience",
                    "Strong analytical and problem-solving skills",
                    "Experience with requirements gathering and documentation",
                    "Proficiency in SQL and data analysis tools",
                    "Bachelor's degree in Business, IT, or related field"
                ],
                preferred_qualifications=[
                    "Experience with Agile/Scrum methodologies",
                    "Knowledge of business intelligence tools (Tableau, Power BI)",
                    "Project management experience",
                    "Industry certifications (CBAP, PMI-PBA)"
                ],
                skills=["SQL", "Excel", "Tableau", "Power BI", "JIRA", "Requirements Analysis", "Data Analysis", "Agile"],
                posted_date="2024-02-10",
                salary_range="$85,000 - $120,000"
            ),
            JobListing(
                id="job_005",
                title="IT Project Manager",
                company="Enterprise Solutions Inc",
                location="Austin, TX",
                employment_type="Full-time",
                description="""Lead technology projects from initiation to completion. Manage cross-functional teams, 
                budgets, timelines, and stakeholder expectations. Drive successful delivery of enterprise software implementations 
                and infrastructure upgrades.""",
                requirements=[
                    "7+ years of project management experience in IT",
                    "PMP or equivalent certification required",
                    "Experience managing projects with budgets over $1M",
                    "Strong leadership and communication skills",
                    "Bachelor's degree in Computer Science, Business, or related field"
                ],
                preferred_qualifications=[
                    "Agile/Scrum Master certification",
                    "Experience with enterprise software implementations (ERP, CRM)",
                    "Knowledge of SDLC and DevOps practices",
                    "Experience in healthcare or financial services"
                ],
                skills=["Project Management", "Agile", "Scrum", "JIRA", "MS Project", "Risk Management", "Budget Management", "Stakeholder Management"],
                posted_date="2024-02-12",
                salary_range="$110,000 - $150,000"
            ),
            JobListing(
                id="job_006",
                title="Management Consultant",
                company="Strategic Advisors LLC",
                location="Boston, MA",
                employment_type="Full-time",
                description="""Join our consulting team to help clients solve complex business challenges. 
                Conduct research, analyze data, develop strategic recommendations, and support implementation. 
                Work across various industries including healthcare, finance, and technology.""",
                requirements=[
                    "3+ years of consulting or strategy experience",
                    "MBA or equivalent advanced degree",
                    "Strong analytical and quantitative skills",
                    "Excellent presentation and communication abilities",
                    "Experience with data analysis and visualization"
                ],
                preferred_qualifications=[
                    "Experience at top-tier consulting firm",
                    "Industry expertise in healthcare or finance",
                    "Advanced Excel and PowerPoint skills",
                    "Experience leading client engagements"
                ],
                skills=["Strategy", "Management Consulting", "Excel", "PowerPoint", "Data Analysis", "Financial Modeling", "Stakeholder Management", "Problem Solving"],
                posted_date="2024-02-14",
                salary_range="$95,000 - $140,000"
            ),
            JobListing(
                id="job_007",
                title="Business Intelligence Analyst",
                company="DataDriven Solutions",
                location="Seattle, WA",
                employment_type="Full-time",
                description="""Transform data into actionable insights. Design and build dashboards, reports, and analytics 
                solutions. Work with business stakeholders to understand requirements and deliver self-service BI capabilities.""",
                requirements=[
                    "4+ years of BI/analytics experience",
                    "Expert knowledge of SQL and database technologies",
                    "Proficiency in Tableau, Power BI, or similar tools",
                    "Strong understanding of data warehousing concepts",
                    "Bachelor's degree in Computer Science, Information Systems, or related field"
                ],
                preferred_qualifications=[
                    "Experience with ETL tools (Informatica, SSIS, Talend)",
                    "Knowledge of Python or R for data analysis",
                    "Cloud data platform experience (Snowflake, BigQuery)",
                    "Experience with dimensional modeling"
                ],
                skills=["SQL", "Tableau", "Power BI", "Excel", "ETL", "Data Warehousing", "Python", "Data Visualization"],
                posted_date="2024-02-15",
                salary_range="$80,000 - $115,000"
            ),
            JobListing(
                id="job_008",
                title="Digital Transformation Consultant",
                company="Innovation Partners",
                location="Remote",
                employment_type="Full-time",
                description="""Help organizations navigate digital transformation initiatives. Assess current state, 
                develop transformation roadmaps, and guide implementation of new technologies and processes. 
                Focus on cloud adoption, automation, and digital customer experiences.""",
                requirements=[
                    "5+ years of consulting or transformation experience",
                    "Understanding of cloud technologies (AWS, Azure, GCP)",
                    "Experience with change management and organizational design",
                    "Strong project management skills",
                    "Bachelor's degree in Business, IT, or related field"
                ],
                preferred_qualifications=[
                    "Experience with Agile transformation",
                    "Knowledge of DevOps and CI/CD practices",
                    "Certification in Change Management (Prosci, ADKAR)",
                    "Experience in retail or manufacturing sectors"
                ],
                skills=["Digital Transformation", "Cloud", "Change Management", "Agile", "Business Process", "Strategy", "Project Management", "Stakeholder Engagement"],
                posted_date="2024-02-16",
                salary_range="$100,000 - $145,000"
            )
        ]
        
        # Filter by search term if provided
        if search:
            search_lower = search.lower()
            mock_jobs = [
                job for job in mock_jobs
                if search_lower in job.title.lower() or search_lower in job.description.lower()
            ]
        
        return mock_jobs
    
    @staticmethod
    def _get_mock_job_details(job_id: str) -> JobListing:
        """Return mock job details"""
        mock_jobs = JobsAPIClient._get_mock_jobs()
        
        for job in mock_jobs:
            if job.id == job_id:
                return job
        
        # Return first job as default
        return mock_jobs[0] if mock_jobs else JobListing(
            id=job_id,
            title="Software Engineer",
            company="Example Company",
            location="Remote",
            description="Sample job description",
            requirements=[],
            skills=[]
        )
