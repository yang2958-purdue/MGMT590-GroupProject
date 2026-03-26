"""
Base adapter interface for job scraping.

All scraper adapters must inherit from BaseAdapter and implement scrape_jobs().
The returned list of dicts must conform to the JobPosting schema below.

# SCHEMA — every adapter must return this exact shape.
# Fields the JS extension currently reads: title, company, location,
# description, url, date_posted, salary. Extra fields are carried through
# but will not break the frontend if absent.
#
# JobPosting schema:
#     {
#         "id":              str,          # unique hash of company + title + url
#         "title":           str,          # job title
#         "company":         str,          # company name
#         "location":        str,          # job location
#         "job_type":        str | None,   # fulltime, parttime, internship, contract
#         "is_remote":       bool,         # whether the job is remote
#         "date_posted":     str,          # ISO 8601 date string
#         "salary_min":      float | None, # minimum salary
#         "salary_max":      float | None, # maximum salary
#         "salary_currency": str | None,   # e.g. "USD"
#         "salary":          str,          # human-readable salary string (backward compat)
#         "description":     str,          # full description, markdown preferred
#         "url":             str,          # direct link to the posting
#         "source":          str,          # origin site: "indeed", "linkedin", etc.
#     }
#
# Any field the source does not provide should be None, never omitted.
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
