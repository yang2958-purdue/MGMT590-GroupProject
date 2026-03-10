"""Job fetching service"""
from typing import List, Optional
from app.domain.models import JobListing
from app.infrastructure.api.jobs_api_client import JobsAPIClient


class JobFetchService:
    """Service for fetching job listings"""
    
    def __init__(self):
        self.api_client = JobsAPIClient()
    
    def fetch_jobs(self, search: str = "", location: str = "", 
                   page: int = 1, limit: int = 20) -> List[JobListing]:
        """Fetch job listings"""
        try:
            return self.api_client.get_jobs(
                search=search,
                location=location,
                page=page,
                limit=limit
            )
        except Exception as e:
            raise Exception(f"Failed to fetch jobs: {str(e)}")
    
    def fetch_job_details(self, job_id: str) -> JobListing:
        """Fetch detailed job information"""
        try:
            return self.api_client.get_job_details(job_id)
        except Exception as e:
            raise Exception(f"Failed to fetch job details: {str(e)}")
    
    def search_jobs(self, query: str) -> List[JobListing]:
        """Search for jobs by query"""
        return self.fetch_jobs(search=query)
