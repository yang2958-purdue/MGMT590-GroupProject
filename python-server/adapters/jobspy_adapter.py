"""
JobSpy scraper adapter.

Uses the python-jobspy library to scrape real job postings from multiple
job boards (Indeed, LinkedIn, Glassdoor, Google Jobs, ZipRecruiter).

To activate: set ACTIVE_ADAPTER = "jobspy" in config.py.

# SCHEMA — this adapter returns dicts conforming to the expanded JobPosting
# contract documented in base_adapter.py. See that file for the full schema.
"""

import hashlib
import logging
import math

import pandas as pd
from jobspy import scrape_jobs as jobspy_scrape

import config
from .base_adapter import BaseAdapter

log = logging.getLogger(__name__)


class JobSpyAdapter(BaseAdapter):
    """Scrapes real job postings via the python-jobspy library."""

    def scrape_jobs(self, criteria: dict) -> list[dict]:
        """
        Scrape job postings matching the given criteria.

        Merges per-request criteria over the JOBSPY_CONFIG defaults in config.py.
        Per-source errors are caught individually so one failing site does not
        kill the entire request.

        Args:
            criteria: Dict with keys (all optional except titles):
                - titles (list[str]): Job titles to search for.
                - companies (list[str]): Target company names.
                - location (str): City/state or "Remote".
                - remote (bool): Remote-only filter.
                - salary_range_min (int): Minimum salary (not sent to jobspy,
                  used for post-filtering if desired).
                - salary_range_max (int): Maximum salary.
                - experience_level (str): entry | mid | senior | lead.
                - distance (int): Miles radius, default 50.
                - hours_old (int): Max age of listings.
                - results_wanted (int): Number of results.
                - job_type (str): fulltime | parttime | internship | contract.

        Returns:
            List of JobPosting dicts. Empty list on total failure.
        """
        defaults = config.JOBSPY_CONFIG
        titles = _normalize_string_list(criteria.get("titles"))
        companies = _normalize_string_list(criteria.get("companies"))
        search_terms = _build_search_terms(titles, companies)

        merged_results: list[dict] = []
        seen_ids: set[str] = set()

        for search_term in search_terms:
            params = {
                "site_name": defaults.get("site_names", ["indeed"]),
                "search_term": search_term,
                "location": criteria.get("location") or None,
                "distance": criteria.get("distance", 50),
                "is_remote": criteria.get("remote", False),
                "job_type": _map_job_type(criteria.get("job_type")),
                "results_wanted": criteria.get("results_wanted", defaults.get("results_wanted", 20)),
                "hours_old": criteria.get("hours_old", defaults.get("hours_old", 72)),
                "description_format": defaults.get("description_format", "markdown"),
                "linkedin_fetch_description": defaults.get("linkedin_fetch_description", True),
            }
            params = {k: v for k, v in params.items() if v is not None}
            log.info("JobSpy params: %s", params)

            try:
                df = jobspy_scrape(**params)
            except Exception as exc:
                log.error("JobSpy scrape failed for '%s': %s", search_term, exc)
                continue

            if df is None or df.empty:
                log.warning("JobSpy returned no results for: %s", search_term)
                continue

            for posting in _normalize_dataframe(df):
                posting_id = posting.get("id")
                if posting_id and posting_id in seen_ids:
                    continue
                if posting_id:
                    seen_ids.add(posting_id)
                merged_results.append(posting)

        if not merged_results:
            return []

        filtered_results = _apply_filters(merged_results, titles, companies)
        return filtered_results


def _normalize_string_list(values) -> list[str]:
    """Normalize a potentially mixed list into non-empty strings."""
    if not values:
        return []
    normalized = []
    for value in values:
        s = _safe_str(value)
        if s:
            normalized.append(s)
    return normalized


def _build_search_terms(titles: list[str], companies: list[str]) -> list[str]:
    """
    Build query terms for JobSpy from title/company filters.

    - titles + companies => one query per combination
    - titles only => one query per title
    - companies only => one query per company with "Software Engineer"
    """
    if titles and companies:
        return [f"{title} at {company}" for title in titles for company in companies]
    if titles:
        return titles
    if companies:
        return [f"Software Engineer at {company}" for company in companies]
    return ["Software Engineer"]


def _apply_filters(results: list[dict], titles: list[str], companies: list[str]) -> list[dict]:
    """Apply post-filtering so company/title filters are enforced."""
    title_needles = [t.lower() for t in titles]
    company_needles = [c.lower() for c in companies]

    def matches_title(job: dict) -> bool:
        if not title_needles:
            return True
        title_text = (job.get("title") or "").lower()
        return any(needle in title_text for needle in title_needles)

    def matches_company(job: dict) -> bool:
        if not company_needles:
            return True
        company_text = (job.get("company") or "").lower()
        return any(needle in company_text for needle in company_needles)

    return [job for job in results if matches_title(job) and matches_company(job)]


def _map_job_type(job_type: str | None) -> str | None:
    """Map the extension's job_type value to jobspy's expected enum."""
    if not job_type:
        return None
    mapping = {
        "fulltime": "fulltime",
        "parttime": "parttime",
        "internship": "internship",
        "contract": "contract",
    }
    return mapping.get(job_type.lower())


def _safe_str(value) -> str | None:
    """Convert a value to str, returning None for NaN/None/empty."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    s = str(value).strip()
    return s if s else None


def _safe_float(value) -> float | None:
    """Convert a value to float, returning None for NaN/None."""
    if value is None:
        return None
    try:
        f = float(value)
        return None if math.isnan(f) else f
    except (ValueError, TypeError):
        return None


def _safe_bool(value) -> bool:
    """Convert a value to bool, defaulting to False for NaN/None."""
    if value is None:
        return False
    if isinstance(value, float) and math.isnan(value):
        return False
    return bool(value)


def _make_salary_string(min_val: float | None, max_val: float | None, currency: str | None) -> str:
    """Synthesize a human-readable salary string for backward compatibility."""
    curr = currency or "USD"
    if min_val is not None and max_val is not None:
        return f"${min_val:,.0f} - ${max_val:,.0f} {curr}"
    if min_val is not None:
        return f"${min_val:,.0f}+ {curr}"
    if max_val is not None:
        return f"Up to ${max_val:,.0f} {curr}"
    return ""


def _make_id(company: str, title: str, url: str) -> str:
    """Generate a deterministic unique ID from company + title + url."""
    raw = f"{company}|{title}|{url}"
    return hashlib.md5(raw.encode()).hexdigest()


def _normalize_dataframe(df: pd.DataFrame) -> list[dict]:
    """Convert a jobspy DataFrame into a list of JobPosting dicts."""
    results = []

    for _, row in df.iterrows():
        try:
            title = _safe_str(row.get("title")) or "Untitled"
            company = _safe_str(row.get("company")) or "Unknown"
            url = _safe_str(row.get("job_url")) or ""
            location = _safe_str(row.get("location")) or ""
            description = _safe_str(row.get("description")) or ""
            source = _safe_str(row.get("site")) or "unknown"

            date_posted = ""
            raw_date = row.get("date_posted")
            if raw_date is not None and not (isinstance(raw_date, float) and math.isnan(raw_date)):
                if isinstance(raw_date, pd.Timestamp):
                    date_posted = raw_date.strftime("%Y-%m-%d")
                else:
                    date_posted = str(raw_date)

            salary_min = _safe_float(row.get("min_amount"))
            salary_max = _safe_float(row.get("max_amount"))
            salary_currency = _safe_str(row.get("currency"))
            salary = _make_salary_string(salary_min, salary_max, salary_currency)

            job_type_raw = _safe_str(row.get("job_type"))
            is_remote = _safe_bool(row.get("is_remote"))

            results.append({
                "id": _make_id(company, title, url),
                "title": title,
                "company": company,
                "location": location,
                "job_type": job_type_raw,
                "is_remote": is_remote,
                "date_posted": date_posted,
                "salary_min": salary_min,
                "salary_max": salary_max,
                "salary_currency": salary_currency,
                "salary": salary,
                "description": description,
                "url": url,
                "source": source,
            })
        except Exception as exc:
            log.warning("Skipping row due to normalization error: %s", exc)
            continue

    return results
