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

The built extension is output to the `dist/` folder. The build runs two steps: the main Vite bundle (side panel + service worker) and a second pass that emits `content/content.js` as a single **IIFE** (required so `chrome.scripting.executeScript` can load the autofill listener as a classic script).

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder
4. The JobBot icon appears in the toolbar. Click it to open the side panel.

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

1. Create an OpenAI API key from your OpenAI account.
2. Configure the key for the Python server (pick one approach):

**Option A — `.env` file (recommended):** Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in either the **project root** `.env` or [`python-server/.env`](python-server/.env.example) (copy from [`python-server/.env.example`](python-server/.env.example) if you use that path). The server loads **both** files on startup and applies **non-empty** values only (project root first, then `python-server/`), so a blank `OPENAI_API_KEY=` line in one file does not block a real key in the other. When you run `start_server.bat` or `./start_server.sh`, these files are picked up automatically.

**Option B — shell environment:** Set variables before starting the Python server:

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

If `OPENAI_API_KEY` is missing, the extension automatically falls back to heuristic parsing.

### 5. User profile (Settings)

Open **Settings** in the side panel and click **Save profile**. Data is stored in `chrome.storage.local` under the key `jobbot_userProfile` and is used by **Autofill** together with the parsed resume.

- **Application answers** — Citizenship, authorized to work (Yes/No), sponsorship (Yes/No), salary, relocation, and optional defaults for sensitive/EEO-style questions.
- **Contact & documents** — LinkedIn URL and default cover letter text.
- **Location** — Country, city, state, ZIP for address fields on forms.
- **Resume corrections** — Overrides for name, email, phone, most recent job, first education block, and skills when the resume parser is wrong. Non-empty values replace parsed resume data during mapping.
- **Custom autofill keys** — Each row maps to `commonAnswers.<yourKey>` (e.g. key `visaStatus`) so you can supply answers for labels that map to those keys.

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
3. Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) via `python-server/.env` (copy from `python-server/.env.example`) or shell `export` / `$env:...`
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
│   │   └── autofill.config.js   # Fill delay, pause-trigger keywords
│   ├── modules/            # Core business logic (ES modules)
│   │   ├── resumeParser.js # PDF/DOCX → structured resume object
│   │   ├── storage.js      # chrome.storage.local wrapper
│   │   ├── jobScraper.js   # Calls Flask server for job postings
│   │   ├── scorer.js       # Fit score + ATS score (keyword overlap)
│   │   ├── tailor.js       # Resume tailoring advice + auto-tailor
│   │   ├── scraper/
│   │   │   └── firecrawlAdapter.js  # Firecrawl API adapter (scrape + extract)
│   │   └── autofill/
│   │       ├── autofillController.js  # Orchestrates the autofill pipeline
│   │       ├── fieldMapper.js         # Maps form fields → resume/profile values
│   │       └── fieldFiller.js         # Content-script DOM filling logic
│   ├── data/               # Static data (company seed list)
│   └── lib/                # Shared constants
├── python-server/          # Local Flask scraper server
│   ├── server.py           # Flask app (/health, /scrape)
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
- **Content script bundle** — The content script is built as an ES module with a shared chunk (`chunks/fieldInference-*.js`). After programmatic inject, the side panel waits on animation frames and retries `sendMessage` until the module finishes loading (so `onMessage` is registered). The DOM scanner recurses into **same-origin iframes** (common on Phenom/ATS pages) and passes `iframePath` so fills target the correct document.
- **No external database** — all persistence via `chrome.storage.local`.
- **Each module** is a standalone ES module with a clean exported interface and no cross-module side effects.
- **AI/LLM calls** (scoring, tailoring) are isolated behind a single function in their modules, marked with `// SWAP:` comments for easy replacement.
- **The JS side** calls `localhost:5001/scrape` and knows nothing about which adapter is active on the server.
- **Autofill pipeline** — Open the **real** application site in a normal browser tab (e.g. Workday, Greenhouse). In the side panel, go to **Autofill** and press **Autofill this tab** to extract fields and fill using pause/resume/skip controls. The job **Detail** page only offers **Open job posting** (listing URL); it does not start autofill. Field discovery uses **Firecrawl** when the site is allowed and `VITE_FIRECRAWL_API_KEY` is set in `.env.local` (see `.env.example`); otherwise the extension scans the **live tab DOM**. **LinkedIn** is skipped for remote Firecrawl extract — rely on DOM scan on the application page. Mapping uses label + control type (e.g. **select** options matched by text/value; phone/email are not applied to yes/no controls). Edit **Settings** to maintain `jobbot_userProfile` (answers, resume overrides, custom keys). Rebuild after changing env vars (`npm run build`).
