---
name: Swap to JobSpy Scraper
overview: Replace the mock BeautifulSoup scraper with JobSpy as the active adapter in the Python Flask server, keeping the existing raw-array response format and BeautifulSoup as a fallback.
todos:
  - id: requirements
    content: Add `python-jobspy` to `python-server/requirements.txt`
    status: completed
  - id: config
    content: "Update `python-server/config.py`: set ACTIVE_ADAPTER to jobspy, add JOBSPY_CONFIG block with site_names, results_wanted, hours_old, description_format, linkedin_fetch_description"
    status: completed
  - id: base-schema
    content: Update `python-server/adapters/base_adapter.py` schema docstring to document expanded JobPosting fields (id, job_type, is_remote, salary_min, salary_max, salary_currency, source)
    status: completed
  - id: jobspy-adapter
    content: Create `python-server/adapters/jobspy_adapter.py` with criteria merging, jobspy call, DataFrame normalization, salary string synthesis, per-source error isolation
    status: completed
  - id: server-loader
    content: Update `python-server/server.py` adapter loader to include jobspy, add A/B testing TODO, ensure all exceptions return JSON array
    status: completed
  - id: verify-build
    content: Install new dependency, start server, verify /scrape returns real job postings with jobspy adapter, then switch to beautifulsoup and verify fallback still works
    status: completed
isProject: false
---

# Swap BeautifulSoup Scraper for JobSpy

## Scope

All changes are inside `python-server/`. No JS files are modified. The `/scrape` endpoint keeps its current raw-array response format. The BeautifulSoup adapter stays untouched as a fallback.

**Note on path mapping:** The user spec references `scraper/` paths. In this codebase, those map to `python-server/`:

- `scraper/scraper.py` = [python-server/server.py](python-server/server.py)
- `scraper/config.py` = [python-server/config.py](python-server/config.py)
- `scraper/adapters/` = [python-server/adapters/](python-server/adapters/)

## Schema Compatibility

The current JS side expects these fields: `title`, `company`, `location`, `description`, `url`, `date_posted`, `salary` (string). The new adapter will return these **plus** the richer fields from the spec (`id`, `job_type`, `is_remote`, `salary_min`, `salary_max`, `salary_currency`, `source`). The JS side will simply ignore the extra fields. The `salary` string field will be synthesized from `salary_min`/`salary_max` for backward compatibility.

The existing `base_adapter.py` schema comment will be updated to reflect the expanded contract, and the method name stays `scrape_jobs` (matching the existing ABC).

## Changes by File

### 1. `python-server/requirements.txt` -- add jobspy

Add `python-jobspy` (the PyPI package name). This provides `from jobspy import scrape_jobs`.

### 2. `python-server/config.py` -- add ACTIVE_ADAPTER flag and JOBSPY_CONFIG

- Change `ACTIVE_ADAPTER` to `"jobspy"`
- Add `JOBSPY_CONFIG` dict with tunable defaults (site_names, results_wanted, hours_old, description_format, linkedin_fetch_description)
- Add comments about LinkedIn rate limiting and Indeed reliability

### 3. `python-server/adapters/base_adapter.py` -- expand schema docs

Update the docstring schema comment to document the full contract including new fields. No code changes to the ABC itself.

### 4. `python-server/adapters/jobspy_adapter.py` -- new file

Full `JobSpyAdapter` implementation:

- `scrape_jobs(self, criteria)` merges incoming criteria over `JOBSPY_CONFIG` defaults
- Maps criteria keys to jobspy parameters: `titles[0]` becomes `search_term`, `location`, `remote` becomes `is_remote`, etc.
- Calls `jobspy.scrape_jobs()` which returns a pandas DataFrame
- Normalizes each row into the `JobPosting` dict schema
- Synthesizes `salary` string from `min_amount`/`max_amount` for backward compatibility
- Generates deterministic `id` via `hashlib.md5(company + title + url)`
- Per-source error isolation: wraps the call in try/except, logs failures, returns empty list on total failure (never raises to Flask)
- LinkedIn rate-limit detection comment

### 5. `python-server/server.py` -- update adapter loader

- Add `"jobspy"` to the `ADAPTERS` dict, importing `JobSpyAdapter`
- Add `# TODO: add per-request adapter override via request header for A/B testing` comment
- Ensure the `/scrape` endpoint catches all exceptions and always returns a JSON array (never a 500 with unhandled exception)
- Keep the raw-array response format unchanged

## Key JobSpy API Details

```python
from jobspy import scrape_jobs

jobs_df = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor"],
    search_term="Software Engineer",
    location="San Francisco, CA",
    results_wanted=20,
    hours_old=72,
    description_format="markdown",
    linkedin_fetch_description=True,
    is_remote=True,
    distance=50,
)
```

The DataFrame columns include: `site`, `job_url`, `title`, `company`, `location`, `date_posted`, `description`, `min_amount`, `max_amount`, `currency`, `is_remote`, `job_type`, among others. The adapter normalizes these into the contract schema.