# JobBot — Browser Extension

A self-contained Manifest V3 browser extension for job search automation and application autofill. The extension uses a Chrome Side Panel (Firefox sidebar) UI and a local Python Flask server for job scraping.

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Chrome** 114+ (for Side Panel support) or **Firefox** 109+ (for sidebar support)

## Quick Start

### 1. Install Node dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

The built extension is output to the `dist/` folder. The build first generates toolbar PNGs (`icons/icon16.png`, etc.) from [`src/sidepanel/icons/billiards-fill.svg`](src/sidepanel/icons/billiards-fill.svg) via [`scripts/generate-extension-icons.mjs`](scripts/generate-extension-icons.mjs), then runs two Vite steps: the main bundle (side panel + service worker) and a second pass that emits `content/content.js` as a single **IIFE** (required so `chrome.scripting.executeScript` can load the autofill listener as a classic script).

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder
4. The JobBot icon appears in the toolbar. Click it to open the side panel.

**Navigation:** The top bar uses compact **icon buttons** (hover for section names) for Upload, Targets, Results, Detail, and Autofill. **Settings** and **Debug** are under **More** (⋮).

### 4. Start the Python scraper server

**Windows:**
```bash
cd python-server
start_server.bat
```

`start_server.bat` installs `python-jobspy` without pinned transitive deps and then
installs compatible `numpy/pandas` versions for newer Python/Windows environments.

**Mac/Linux:**
```bash
cd python-server
chmod +x start_server.sh
./start_server.sh
```

The server starts on `http://localhost:5001`. The extension calls this server to fetch job postings.

### 4.1 Optional: Enable ChatGPT resume parsing (recommended)

The extension can enhance resume parsing via ChatGPT through the local Python server.
The LLM parser now scans the full resume text for likely university/college names to improve `education.school` extraction quality.
When LLM parsing is enabled, education entries from heuristic + LLM parsing are merged so prior schools are retained instead of being dropped.
For PDF uploads, the extension now also sends the original PDF bytes to the server so the LLM can parse from the document directly (with extracted text used as fallback context).

1. Create an OpenAI API key from your OpenAI account.
2. Configure the key (pick one approach):

**Option A — Extension (simplest):** Open **More → Settings** in the side panel, go to the **API keys** tab, paste your OpenAI key, and click **Save**. The extension stores it in `chrome.storage.local` and sends it to the local Python server only when calling `/parse-resume-llm` and `/extract-skills` (via the `X-OpenAI-API-Key` header). If you do not save a key in the extension, the server still uses **Option B** or **C** below.

**Option B — `.env` file:** Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in either the **project root** `.env` or [`python-server/.env`](python-server/.env.example) (copy from [`python-server/.env.example`](python-server/.env.example) if you use that path). The server loads **both** files on startup and applies **non-empty** values only (project root first, then `python-server/`), so a blank `OPENAI_API_KEY=` line in one file does not block a real key in the other. When you run `start_server.bat` or `./start_server.sh`, these files are picked up automatically.

**Option C — shell environment:** Set variables before starting the Python server:

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="your_openai_api_key"
$env:OPENAI_MODEL="gpt-4o-mini"
cd python-server
start_server.bat
```

**Mac/Linux (bash):**
```bash
export OPENAI_API_KEY="your_openai_api_key"
export OPENAI_MODEL="gpt-4o-mini"
cd python-server
./start_server.sh
```

If no OpenAI key is available (neither in the extension nor in the server environment), the extension automatically falls back to heuristic parsing.

### 4.2 ATS / keyword scoring and tailoring (OpenAI via local server)

When an OpenAI key is available (extension **API keys** tab and/or `OPENAI_API_KEY` on the Python server), the extension calls **`POST /extract-skills`** (`http://localhost:5001/extract-skills`) to extract **skill phrases** from your resume and from each job description. Fit score and ATS score are computed from the overlap of those lists (same env vars as resume parsing: `OPENAI_API_KEY`, optional `OPENAI_MODEL`).

- **Request body:** `{ "text": "<plain text>", "kind": "resume" | "job" }`
- **Response:** `{ "skills": ["...", ...] }` (deduplicated, capped server-side)

Prompt text lives in [`python-server/prompts/skills_extraction.py`](python-server/prompts/skills_extraction.py) so you can tune extraction without editing Flask routes.

**Fallback:** If the key is missing, the server returns an error, or the request fails (server not running, network error), the extension uses the previous **heuristic** keyword overlap in [`src/modules/scorer.js`](src/modules/scorer.js) and [`src/modules/tailor.js`](src/modules/tailor.js) (tokenize + stopwords).

**Cost / latency:** Each job search performs **one** resume extraction plus **one extraction per job posting** returned by the scraper.

### 5. User profile and API keys (Settings)

Open **More → Settings** in the side panel. Use the **Profile** tab to edit answers and overrides, then click **Save profile**. The saved profile is stored in `chrome.storage.local` under the key `jobbot_userProfile` and is used by **Autofill** together with the parsed resume.

Use the **API keys** tab to store **Firecrawl** and **OpenAI** keys in `chrome.storage.local` (see §4.1 and `.env.example`). The **Key checks** card on that tab probes the Firecrawl API (when a key is present), OpenAI’s models endpoint (when an extension key starts with `sk-`), and `GET /health` on the Python server (which reports whether `OPENAI_API_KEY` is set server-side). Resolution order: **Firecrawl** — extension storage first, then `VITE_FIRECRAWL_API_KEY` at build time if storage is empty. **OpenAI** — extension storage first (sent to `localhost:5001`); if unset, the Python server uses `OPENAI_API_KEY` from its `.env`.

**Session vs persistent data:** Parsed resume data is stored in **`chrome.storage.local`** so the latest parsed file is available across browser restarts; the Upload page shows the saved file name + parse time and asks whether to continue with it or upload a new PDF/DOCX. Search targets, job results, selected job, and in-progress autofill state are stored in **`chrome.storage.session`** and are cleared when the browser session ends (typically after you quit the browser). Settings and the saved user profile also remain in **`chrome.storage.local`** across restarts. If `chrome.storage.session` is unavailable, the extension falls back to `local` for session keys (data may persist until you clear extension storage).

- **Application answers** — Citizenship, authorized to work (Yes/No), sponsorship (Yes/No), salary, relocation, and optional defaults for sensitive/EEO-style questions.
- **Contact & documents** — LinkedIn URL and default cover letter text.
- **Location** — Country, city, state, ZIP for address fields on forms.
- **Resume corrections** — Overrides for name, email, phone, most recent job, first education block, and skills when the resume parser is wrong. Non-empty values replace parsed resume data during mapping.
- **Custom autofill keys** — Each row maps to `commonAnswers.<yourKey>` (e.g. key `visaStatus`) so you can supply answers for labels that map to those keys. Matching now also supports partial question-style keys (for example `are you subjec`) for long Workday prompts.

The scraper card shows **Connected** when `GET /health` on the local server succeeds.

### 6. Development workflow

For live rebuilds during development:

```bash
npm run dev
```

This runs `vite build --watch`. After each rebuild, go to `chrome://extensions/` and click the reload button on the JobBot extension.

## ChatGPT Resume Parser Setup Checklist

1. `npm install`
2. `npm run build`
3. Provide an OpenAI key: **More → Settings → API keys** (Save), and/or set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) via `python-server/.env` (copy from `python-server/.env.example`) or shell `export` / `$env:...`
4. Start python server (`start_server.bat` or `./start_server.sh`)
5. Load/reload unpacked extension from `dist/`
6. Upload resume again (Debug tab should show `Parser Source = llm-hybrid`)

## Project Structure

```
├── src/
│   ├── sidepanel/          # Side Panel UI (main app)
│   │   ├── pages/          # Upload, Target, Results, Detail, Autofill, Settings, Debug (parser matrix + parsed experience)
│   │   └── components/     # Nav, ResumeUpload, JobTable, AutofillPanel, etc.
│   ├── background/         # Service worker
│   ├── content/            # Content script for autofill
│   ├── config/             # Feature config files
│   │   ├── firecrawl.config.js  # Firecrawl API key + mock mode
│   │   ├── autofill.config.js   # Fill delay, pause-trigger keywords
│   │   └── domScanSelectors.js  # Shared CSS for DOM field discovery (ATS / Workday)
│   ├── modules/            # Core business logic (ES modules)
│   │   ├── resumeParser.js # PDF/DOCX → structured resume object
│   │   ├── storage.js      # chrome.storage.session (ephemeral) + local (profile/settings/API keys)
│   │   ├── jobScraper.js   # Calls Flask server for job postings
│   │   ├── scorer.js       # Fit + ATS scores (LLM skill overlap or heuristic fallback)
│   │   ├── tailor.js       # Tailoring advice + auto-tailor (same)
│   │   ├── llmSkillExtractor.js  # POST /extract-skills client
│   │   ├── skillMatch.js   # Skill list overlap for scores
│   │   ├── scraper/
│   │   │   └── firecrawlAdapter.js  # Firecrawl API adapter (scrape + extract)
│   │   └── autofill/
│   │       ├── autofillController.js  # Orchestrates the autofill pipeline
│   │       ├── domFieldScanner.js       # Discover fillable DOM controls (iframes + shadow)
│   │       ├── domFillableHeuristic.js  # Deep-scan fallback when CSS misses Workday widgets
│   │       ├── fieldMapper.js         # Maps form fields → resume/profile values
│   │       └── fieldFiller.js         # Content-script DOM filling logic
│   ├── data/               # Static data (company seed list)
│   └── lib/                # Shared constants and API key resolution (`apiKeys.js`)
├── python-server/          # Local Flask scraper server
│   ├── server.py           # Flask app (/health, /scrape, /parse-resume-llm, /extract-skills)
│   ├── prompts/            # OpenAI prompt strings (e.g. skills_extraction.py)
│   ├── config.py           # ACTIVE_ADAPTER selector
│   └── adapters/           # Swappable scraper implementations
├── manifest.json           # MV3 manifest (source)
├── icons/                  # Extension icons
└── dist/                   # Built extension (gitignored)
```

## Swapping the Scraper Adapter

The Python server uses an adapter pattern. The default adapter is **JobSpy**, which scrapes real job postings from Indeed, LinkedIn, Glassdoor, Google Jobs, and ZipRecruiter. To change scrapers, edit one line in `python-server/config.py`:

```python
ACTIVE_ADAPTER = "jobspy"          # real scraping via python-jobspy (default)
ACTIVE_ADAPTER = "beautifulsoup"   # mock data for offline development
ACTIVE_ADAPTER = "firecrawl"       # future adapter (not yet implemented)
```

JobSpy-specific settings (sites, result count, max age) can be tuned in the `JOBSPY_CONFIG` block in the same file.

## Architecture Notes

- **Host permissions** — `manifest.json` includes `<all_urls>` so `chrome.scripting.executeScript` can inject the content script after an extension reload (when `tabs.sendMessage` would otherwise fail). Chrome may prompt for broader site access on install/update.
- **Content script bundle** — The content script is built as an ES module with a shared chunk (`chunks/fieldInference-*.js`). After programmatic inject, the side panel waits on animation frames and retries `sendMessage` until the module finishes loading (so `onMessage` is registered). DOM scan selectors live in [`src/config/domScanSelectors.js`](src/config/domScanSelectors.js) (`primary` + `wide`) so probes, content-script scans, and inline fallback agree. The DOM scanner recurses into **same-origin iframes** (common on Phenom/ATS pages) and passes `iframePath` so fills target the correct document. If content-script extraction fails, controller fallback extraction scans open shadow roots too (custom controls common on Workday). DOM scan also retries with short delays before returning no fields to handle Workday hydration timing.
- **Education parsing** — The resume parser uses education-specific heuristics plus a curated university-name list/keyword matcher to better distinguish `school` values from degree or field-of-study text.
- **No external database** — persistence via `chrome.storage.session` (resume, search, results, autofill session) and `chrome.storage.local` (settings and saved profile).
- **Each module** is a standalone ES module with a clean exported interface and no cross-module side effects.
- **AI/LLM calls** — Resume parsing and skill extraction go through the Python server (`/parse-resume-llm`, `/extract-skills`). Prompts for skill extraction are in `python-server/prompts/`. The extension falls back to heuristics if OpenAI is unavailable.
- **The JS side** calls `localhost:5001/scrape` and knows nothing about which adapter is active on the server.
- **Autofill pipeline** — Open the **real** application site in a normal browser tab (e.g. Workday, Greenhouse). In the side panel, go to **Autofill** and press **Autofill this tab** to extract fields and fill using pause/resume/skip controls. The job **Detail** page only offers **Open job posting** (listing URL); it does not start autofill. Field discovery uses **Firecrawl** when the site is allowed and a Firecrawl key is set (**More → Settings → API keys**, or `VITE_FIRECRAWL_API_KEY` in `.env.local` at build time — see `.env.example`); otherwise the extension scans the **live tab DOM**. **LinkedIn** is skipped for remote Firecrawl extract — rely on DOM scan on the application page. Mapping uses label + control type (e.g. **select** options matched by text/value; phone/email are not applied to yes/no controls). For Workday-style mirrored controls, text inputs that duplicate a dropdown/radio question are skipped so they do not clear committed selections. Custom combobox fills now verify that selection text is committed before advancing to the next field. **Work experience:** the parser keeps multiple jobs from your resume; before filling, the extension clicks **Add** on Workday enough times to match the number of parsed roles (up to 10), then maps each repeater row to `workExperience[0]`, `[1]`, … in order. Edit **Settings → Profile** to maintain `jobbot_userProfile` (answers, resume overrides, custom keys). Rebuild after changing Vite env vars (`npm run build`) if you rely on build-time Firecrawl key fallback.
- **Workday question labels** — Workday question dropdowns usually have button text like `Select One`, while the real prompt is in `fieldset > legend` rich text. DOM scan now extracts legend/rich-label prompt text so mapping keys resolve to the actual question and autofill can proceed dropdown-by-dropdown.
