"""
Base adapter interface for job scraping.

All scraper adapters must inherit from BaseAdapter and implement scrape_jobs().
The returned list of dicts must conform to the JobPosting schema below.

JobPosting schema:
    {
        "title":       str,  # Job title
        "company":     str,  # Company name
        "location":    str,  # Job location
        "description": str,  # Full job description text
        "url":         str,  # Link to the posting
        "date_posted": str,  # ISO date or human-readable string
        "salary":      str,  # Salary info (optional, may be empty)
    }
"""

from abc import ABC, abstractmethod


class BaseAdapter(ABC):
    """Abstract base class for job scraper adapters."""

    @abstractmethod
    def scrape_jobs(self, criteria: dict) -> list[dict]:
        """
        Scrape job postings matching the given criteria.

        Args:
            criteria: Dict with keys:
                - titles (list[str]): Job titles to search for.
                - companies (list[str]): Target company names.
                - location (str): Location filter.
                - salary_range_min (int, optional): Minimum salary.
                - salary_range_max (int, optional): Maximum salary.
                - experience_level (str, optional): entry | mid | senior | lead.
                - remote (bool, optional): Remote-only filter.

        Returns:
            List of JobPosting dicts.
        """
        ...
