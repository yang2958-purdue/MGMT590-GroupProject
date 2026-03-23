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

The built extension is output to the `dist/` folder.

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

**Mac/Linux:**
```bash
cd python-server
chmod +x start_server.sh
./start_server.sh
```

The server starts on `http://localhost:5001`. The extension calls this server to fetch job postings.

### 5. Development workflow

For live rebuilds during development:

```bash
npm run dev
```

This runs `vite build --watch`. After each rebuild, go to `chrome://extensions/` and click the reload button on the JobBot extension.

## Project Structure

```
├── src/
│   ├── sidepanel/          # Side Panel UI (main app)
│   │   ├── pages/          # Upload, Target, Results, Detail, Settings
│   │   └── components/     # Nav, ResumeUpload, JobTable, etc.
│   ├── background/         # Service worker
│   ├── content/            # Content script for autofill
│   ├── modules/            # Core business logic (ES modules)
│   │   ├── resumeParser.js # PDF/DOCX → structured resume object
│   │   ├── storage.js      # chrome.storage.local wrapper
│   │   ├── jobScraper.js   # Calls Flask server for job postings
│   │   ├── scorer.js       # Fit score + ATS score (keyword overlap)
│   │   ├── tailor.js       # Resume tailoring advice + auto-tailor
│   │   └── autofill.js     # Autofill engine for application forms
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

The Python server uses an adapter pattern. To change scrapers, edit one line in `python-server/config.py`:

```python
ACTIVE_ADAPTER = "beautifulsoup"   # change to "firecrawl" when ready
```

## Architecture Notes

- **No external database** — all persistence via `chrome.storage.local`.
- **Each module** is a standalone ES module with a clean exported interface and no cross-module side effects.
- **AI/LLM calls** (scoring, tailoring) are isolated behind a single function in their modules, marked with `// SWAP:` comments for easy replacement.
- **The JS side** calls `localhost:5001/scrape` and knows nothing about which adapter is active on the server.
