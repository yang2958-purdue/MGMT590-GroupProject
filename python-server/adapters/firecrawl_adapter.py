"""
Firecrawl scraper adapter (stub).

This adapter is a future drop-in replacement for BeautifulSoupAdapter.
To activate it, change ACTIVE_ADAPTER in config.py to "firecrawl".
"""

from .base_adapter import BaseAdapter


class FirecrawlAdapter(BaseAdapter):
    """Stub Firecrawl adapter -- not yet implemented."""

    def scrape_jobs(self, criteria: dict) -> list[dict]:
        """
        Not yet implemented.

        Raises:
            NotImplementedError: Always. Swap to beautifulsoup in config.py.
        """
        raise NotImplementedError(
            "Firecrawl adapter not yet implemented. "
            "Change ACTIVE_ADAPTER to 'beautifulsoup' in config.py."
        )
