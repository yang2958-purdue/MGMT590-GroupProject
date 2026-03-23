"""SerpAPI scraper stub."""

from scrapers.base_scraper import BaseScraper, JobPosting


class SerpScraper:
    def search(
        self,
        titles: list[str],
        companies: list[str],
        location: str,
    ) -> list[JobPosting]:
        raise NotImplementedError(
            "SerpScraper not configured. Add serp_api_key to config.json and swap the import in main.py."
        )
