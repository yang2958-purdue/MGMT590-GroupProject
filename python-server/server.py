"""
JobBot scraper server.

A local Flask server that exposes a /scrape endpoint for the browser extension.
The active scraper adapter is selected by config.ACTIVE_ADAPTER.
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─── Adapter loader ──────────────────────────────────────────────────────
# TODO: add per-request adapter override via request header for A/B testing

if config.ACTIVE_ADAPTER == "jobspy":
    from adapters.jobspy_adapter import JobSpyAdapter as AdapterClass
elif config.ACTIVE_ADAPTER == "beautifulsoup":
    from adapters.beautifulsoup_adapter import BeautifulSoupAdapter as AdapterClass
elif config.ACTIVE_ADAPTER == "firecrawl":
    from adapters.firecrawl_adapter import FirecrawlAdapter as AdapterClass
else:
    raise ValueError(
        f"Unknown adapter '{config.ACTIVE_ADAPTER}'. "
        f"Valid options: jobspy, beautifulsoup, firecrawl"
    )

adapter = AdapterClass()
log.info("Active scraper adapter: %s", config.ACTIVE_ADAPTER)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint used by the browser extension."""
    return jsonify({"status": "ok"})


@app.route("/scrape", methods=["POST"])
def scrape():
    """
    Scrape job postings.

    Accepts JSON body:
        {
            "titles": ["Software Engineer"],
            "companies": ["Google", "Meta"],
            "location": "Remote",
            "salary_range_min": 80000,
            "salary_range_max": 150000,
            "experience_level": "mid",
            "remote": true
        }

    Returns JSON array of JobPosting objects.
    """
    criteria = request.get_json(silent=True) or {}
    log.info("POST /scrape — criteria: %s", criteria)

    try:
        results = adapter.scrape_jobs(criteria)
        log.info("Returning %d results", len(results))
        return jsonify(results)
    except NotImplementedError as exc:
        log.warning("Adapter not implemented: %s", exc)
        return jsonify([]), 501
    except Exception as exc:
        log.exception("Scraper error: %s", exc)
        return jsonify([])


if __name__ == "__main__":
    log.info("Starting scraper server on port %d", config.PORT)
    app.run(host="127.0.0.1", port=config.PORT, debug=config.DEBUG)
