"""
BeautifulSoup-based job scraper for Indeed. Implements BaseScraper.
"""
import logging
import time
import re
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import JobPosting

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class Bs4Scraper:
    """Scrape job postings from Indeed using requests + BeautifulSoup."""

    def __init__(self, request_delay: float = 1.5):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self.request_delay = request_delay

    def search(
        self,
        titles: list[str],
        companies: list[str],
        location: str,
    ) -> list[JobPosting]:
        """
        For each (title, company) combination, query Indeed and collect job postings.
        Deduplicate by URL. Follow each job link to get full description.
        """
        titles = [t.strip() for t in titles if t.strip()]
        companies = [c.strip() for c in companies if c.strip()]
        if not titles:
            titles = ["software engineer"]

        seen_urls: set[str] = set()
        results: list[JobPosting] = []

        for title in titles[:5]:
            for company in (companies[:5] if companies else [""]):
                query = f"{title}"
                if company:
                    query += f" {company}"
                try:
                    page_results = self._search_page(query, location, seen_urls)
                    results.extend(page_results)
                except Exception as e:
                    logger.warning("Bs4Scraper search page error: %s", e)
                time.sleep(self.request_delay)

        return results

    def _search_page(
        self, query: str, location: str, seen_urls: set[str]
    ) -> list[JobPosting]:
        """Fetch one Indeed search page and resolve job links to full postings."""
        base = "https://www.indeed.com"
        q = quote_plus(query)
        loc = quote_plus(location or "Remote")
        url = f"{base}/jobs?q={q}&l={loc}"
        out: list[JobPosting] = []

        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
        except Exception as e:
            logger.warning("Indeed request failed: %s", e)
            return out

        soup = BeautifulSoup(resp.text, "html.parser")

        # Indeed structure: job cards often in div with data-jk or link to /viewjob?jk=...
        job_links: list[tuple[str, str, str]] = []
        for a in soup.select('a[href*="/rc/clk?"], a[href*="/viewjob?"], a[href*="/job/"]'):
            href = a.get("href")
            if not href:
                continue
            full_url = urljoin(base, href)
            if full_url in seen_urls:
                continue
            title_el = a.select_one("[class*='jobTitle']") or a
            title_text = (title_el.get_text(strip=True) or "Job")[:200]
            company_el = a.find_previous(["div", "span"], class_=re.compile(r"company", re.I)) or a.find_previous("span")
            company_text = (company_el.get_text(strip=True) if company_el else "")[:200] or "Company"
            job_links.append((full_url, title_text, company_text))

        for job_url, title_text, company_text in job_links[:15]:
            if job_url in seen_urls:
                continue
            seen_urls.add(job_url)
            try:
                posting = self._fetch_posting(job_url, title_text, company_text, location)
                if posting:
                    out.append(posting)
            except Exception as e:
                logger.warning("Fetch posting failed %s: %s", job_url, e)
            time.sleep(self.request_delay)

        return out

    def _fetch_posting(
        self, url: str, title: str, company: str, location: str
    ) -> JobPosting | None:
        """Fetch full job page and extract description."""
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
        except Exception:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # Common Indeed description containers
        desc_sel = (
            "#jobDescriptionText, "
            "[class*='jobDescription'], "
            ".jobsearch-JobComponent-description, "
            "div[data-job-details]"
        )
        desc_el = soup.select_one(desc_sel)
        description = desc_el.get_text(separator="\n", strip=True) if desc_el else ""
        if not description and soup.find(string=re.compile(r"description|qualification", re.I)):
            description = soup.get_text(separator="\n", strip=True)[:15000]

        return JobPosting(
            title=title or "Job",
            company=company or "Company",
            location=location or "Remote",
            description=description or "No description available.",
            url=url,
            date_posted="",
        )
