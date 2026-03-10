"""
Job scraper service - Searches for jobs using SerpAPI and fallback methods
"""
import os
import requests
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
from serpapi import GoogleSearch


class JobScraper:
    """Searches for jobs across multiple platforms"""
    
    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.use_serpapi = bool(self.serpapi_key)
    
    def search_jobs(
        self,
        companies: List[str],
        job_titles: List[str],
        location: Optional[str] = None,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Search for jobs matching criteria
        
        Args:
            companies: List of target companies
            job_titles: List of job title keywords
            location: Job location (optional)
            max_results: Maximum number of results to return
            
        Returns:
            List of job listings
        """
        all_jobs = []
        
        # Generate search queries (company + job title combinations)
        search_queries = []
        for company in companies:
            for title in job_titles:
                query = f"{title} {company}"
                if location:
                    query += f" {location}"
                search_queries.append((query, company))
        
        # Execute searches
        for query, company in search_queries[:max_results // len(job_titles)]:
            if self.use_serpapi:
                jobs = self._search_serpapi(query, company, location)
            else:
                jobs = self._search_fallback(query, company, location)
            
            all_jobs.extend(jobs)
            
            if len(all_jobs) >= max_results:
                break
        
        # Deduplicate by URL
        unique_jobs = {}
        for job in all_jobs:
            if job["url"] not in unique_jobs:
                unique_jobs[job["url"]] = job
        
        return list(unique_jobs.values())[:max_results]
    
    def _search_serpapi(self, query: str, company: str, location: Optional[str]) -> List[Dict]:
        """Search using SerpAPI Google Jobs endpoint"""
        try:
            params = {
                "engine": "google_jobs",
                "q": query,
                "api_key": self.serpapi_key,
            }
            
            if location:
                params["location"] = location
            
            search = GoogleSearch(params)
            results = search.get_dict()
            
            jobs = []
            for job_result in results.get("jobs_results", [])[:10]:
                job = {
                    "job_id": self._generate_job_id(job_result.get("job_id", "") + job_result.get("title", "")),
                    "title": job_result.get("title", ""),
                    "company": job_result.get("company_name", company),
                    "description": job_result.get("description", ""),
                    "url": job_result.get("share_url") or job_result.get("apply_link", ""),
                    "location": job_result.get("location", location),
                    "date_posted": job_result.get("detected_extensions", {}).get("posted_at", ""),
                    "source": "serpapi"
                }
                jobs.append(job)
            
            return jobs
        
        except Exception as e:
            print(f"SerpAPI search failed for '{query}': {str(e)}")
            return []
    
    def _search_fallback(self, query: str, company: str, location: Optional[str]) -> List[Dict]:
        """
        Fallback search method (basic demonstration)
        In production, this would scrape LinkedIn, Indeed, etc.
        """
        # This is a placeholder - real implementation would use requests + beautifulsoup4
        # For demo purposes, return mock data structure
        print(f"⚠️ SerpAPI key not configured. Using fallback method for: {query}")
        
        # In a real implementation, you would:
        # 1. Build LinkedIn/Indeed search URLs
        # 2. Make requests with proper headers (User-Agent, etc.)
        # 3. Parse HTML with BeautifulSoup4
        # 4. Extract job listings
        
        # For now, return empty list (requires API key)
        return []
    
    def _generate_job_id(self, seed: str) -> str:
        """Generate consistent job ID from seed string"""
        return hashlib.md5(seed.encode()).hexdigest()[:16]
    
    def search_company_careers_page(self, company: str, job_title: str) -> List[Dict]:
        """
        Search company career pages directly (Greenhouse, Lever, Workday)
        This is a Phase 2 feature - returns empty for now
        """
        # TODO: Implement in Phase 2
        # - Detect career page platform (Greenhouse, Lever, Workday)
        # - Use platform-specific API or scraping logic
        # - Parse job listings
        return []


class CompanyCareerPageScraper:
    """
    Scrapes company career pages (Greenhouse, Lever, Workday)
    Phase 2 feature
    """
    
    GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
    LEVER_API = "https://api.lever.co/v0/postings/{company}"
    
    def __init__(self):
        pass
    
    def detect_platform(self, company_url: str) -> Optional[str]:
        """Detect which ATS platform a company uses"""
        # Check for common patterns in career page URLs
        if "greenhouse.io" in company_url:
            return "greenhouse"
        elif "lever.co" in company_url:
            return "lever"
        elif "myworkdayjobs.com" in company_url:
            return "workday"
        return None
    
    def scrape_greenhouse(self, company_id: str) -> List[Dict]:
        """Scrape jobs from Greenhouse API (public)"""
        try:
            url = self.GREENHOUSE_API.format(company=company_id)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            jobs_data = response.json()
            jobs = []
            
            for job in jobs_data.get("jobs", []):
                jobs.append({
                    "job_id": str(job.get("id")),
                    "title": job.get("title", ""),
                    "company": company_id,
                    "description": job.get("content", ""),
                    "url": job.get("absolute_url", ""),
                    "location": job.get("location", {}).get("name", ""),
                    "date_posted": job.get("updated_at", ""),
                    "source": "greenhouse"
                })
            
            return jobs
        
        except Exception as e:
            print(f"Failed to scrape Greenhouse for {company_id}: {str(e)}")
            return []
    
    def scrape_lever(self, company_id: str) -> List[Dict]:
        """Scrape jobs from Lever API (public)"""
        try:
            url = self.LEVER_API.format(company=company_id)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            jobs_data = response.json()
            jobs = []
            
            for job in jobs_data:
                jobs.append({
                    "job_id": job.get("id", ""),
                    "title": job.get("text", ""),
                    "company": company_id,
                    "description": job.get("description", ""),
                    "url": job.get("hostedUrl", ""),
                    "location": job.get("categories", {}).get("location", ""),
                    "date_posted": str(job.get("createdAt", "")),
                    "source": "lever"
                })
            
            return jobs
        
        except Exception as e:
            print(f"Failed to scrape Lever for {company_id}: {str(e)}")
            return []


# Singleton instance
job_scraper = JobScraper()
company_scraper = CompanyCareerPageScraper()

