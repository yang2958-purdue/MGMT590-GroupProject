# ─── Scraper Server Configuration ─────────────────────────────────────────
#
# Change ACTIVE_ADAPTER to swap the scraper implementation.
# Valid values: "jobspy", "beautifulsoup", "firecrawl"

ACTIVE_ADAPTER = "jobspy"

PORT = 5001

DEBUG = True

# ─── JobSpy Configuration ─────────────────────────────────────────────────
#
# Tunable defaults for the JobSpy adapter. Per-request criteria values
# override these when provided.

JOBSPY_CONFIG = {
    # Sites to scrape. Indeed is the most reliable for uninterrupted scraping.
    # LinkedIn may rate-limit aggressively around page 10 of results —
    # consider removing it from the list if you hit persistent 429 errors.
    "site_names": ["indeed", "linkedin", "glassdoor", "google", "zip_recruiter"],
    "results_wanted": 20,
    "hours_old": 72,
    "description_format": "markdown",
    "linkedin_fetch_description": True,
}
