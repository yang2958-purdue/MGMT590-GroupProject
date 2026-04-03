# JobBot — Electron + Next.js Implementation Plan & Cursor Prompt

---

## PART 1: IMPLEMENTATION PLAN

### Architecture Overview

A **self-contained Electron desktop application** with a **Next.js (static export) frontend** and a **FastAPI Python backend** running as a local child process. No web server is hosted externally. The user double-clicks a packaged `.exe` / `.app` / `.deb` and the app opens natively.

```
┌─────────────────────────────────────────────┐
│              Electron Shell                 │
│                                             │
│  ┌─────────────────┐   ┌─────────────────┐  │
│  │  Renderer       │   │  Main Process   │  │
│  │  (Chromium)     │◄──│  (Node.js)      │  │
│  │                 │IPC│                 │  │
│  │  Next.js app    │   │  - Window mgmt  │  │
│  │  (static build) │   │  - File dialogs │  │
│  │                 │   │  - Spawns Python │  │
│  └────────┬────────┘   └────────┬────────┘  │
│           │ HTTP localhost      │ child_proc │
│           ▼                     ▼            │
│  ┌─────────────────────────────────────────┐ │
│  │         FastAPI (Python)                │ │
│  │  - Resume parsing                       │ │
│  │  - Job scraping                         │ │
│  │  - TF-IDF scoring                       │ │
│  │  - ATS scoring                          │ │
│  │  - Resume tailoring (AI)                │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Communication pattern:**
- Electron **Main Process** spawns `python backend/main.py` on app start, kills it on quit
- Electron **Renderer** (Next.js) calls `http://localhost:7823` via standard `fetch()`
- Electron **IPC** handles only native OS operations: file open dialog, file save dialog, getting config file path
- All business logic lives in Python — the frontend is purely presentational

---

### Project Structure

```
jobbot/
├── package.json                  # Electron + Next.js deps, scripts
├── next.config.js                # output: 'export', basePath config
├── electron.config.js            # electron-builder packaging config
├── .gitignore
│
├── electron/                     # Electron main process (Node.js)
│   ├── main.ts                   # App entry: window, Python spawn, IPC
│   ├── preload.ts                # Context bridge: exposes safe IPC to renderer
│   └── pythonBridge.ts           # Spawns + manages the Python child process
│
├── src/                          # Next.js frontend (React)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Root: redirects to /resume
│   │   ├── resume/page.tsx       # Step 1: Upload resume
│   │   ├── search/page.tsx       # Steps 2–3: Companies + job titles
│   │   ├── results/page.tsx      # Step 4: Ranked job list table
│   │   ├── posting/page.tsx      # Step 5: Job detail + scores
│   │   └── tailor/page.tsx       # Step 6: Tailored resume output
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # Step navigation sidebar
│   │   │   └── StepGuard.tsx     # Redirect if prereqs not met
│   │   ├── resume/
│   │   │   ├── ResumeDropzone.tsx
│   │   │   └── SkillsPreview.tsx
│   │   ├── search/
│   │   │   ├── TagInput.tsx      # Reusable add/remove tag input
│   │   │   └── SearchForm.tsx
│   │   ├── results/
│   │   │   ├── JobTable.tsx
│   │   │   └── ScoreBadge.tsx
│   │   ├── posting/
│   │   │   ├── PostingHeader.tsx
│   │   │   ├── KeywordPanel.tsx  # Matched vs missing keywords
│   │   │   └── ScoreGauge.tsx
│   │   └── tailor/
│   │       ├── TailoredResume.tsx
│   │       └── ExportButtons.tsx
│   ├── lib/
│   │   ├── api.ts                # All fetch() calls to Python backend
│   │   ├── store.ts              # Zustand global state
│   │   └── types.ts              # Shared TypeScript types
│   └── styles/
│       └── globals.css
│
└── backend/                      # Python FastAPI backend
    ├── main.py                   # FastAPI app entry, route definitions
    ├── requirements.txt
    ├── config.json               # gitignored: API keys + prefs
    ├── data/
    │   └── sessions/             # Optional saved sessions (JSON)
    ├── core/
    │   ├── resume_parser.py      # PDF/DOCX/TXT → structured dict
    │   ├── job_scorer.py         # TF-IDF fit score (0–10)
    │   ├── ats_scorer.py         # Keyword coverage score (0–100%)
    │   └── resume_tailor.py      # AI-powered resume rewrite
    ├── scrapers/
    │   ├── base_scraper.py       # Protocol/interface definition
    │   ├── bs4_scraper.py        # BeautifulSoup default implementation
    │   └── serp_scraper.py       # SerpAPI stub (drop-in swap)
    └── ai/
        ├── base_ai.py            # Protocol/interface definition
        ├── anthropic_ai.py       # Claude implementation
        └── openai_ai.py          # OpenAI stub (drop-in swap)
```

---

### Pipeline Breakdown

#### Step 1 — Resume Upload
- User drags/drops or browses for PDF/DOCX/TXT via `ResumeDropzone`
- Electron IPC returns the file path; frontend reads file bytes and POSTs to `POST /api/resume/parse`
- Python parses → returns `{ raw_text, skills, experience, education }`
- Zustand stores result; `SkillsPreview` displays extracted skills as chips
- Step nav unlocks Step 2

#### Step 2–3 — Search Configuration
- `TagInput` components for companies and job titles (type + Enter to add, click × to remove)
- Location text field (default: "Remote"), remote toggle
- "Run Search" → `POST /api/jobs/search` with `{ titles, companies, location }`
- Python runs scraper, scores all results, returns ranked `JobPosting[]`
- Frontend navigates to Results, stores postings in Zustand

#### Step 4 — Ranked Results
- `JobTable` renders sortable columns: Fit Score, ATS Score, Title, Company, Location, Date
- Score columns render colored `ScoreBadge` components (green/amber/red thresholds)
- Click any row → navigate to `/posting?id=<index>`
- "Export CSV" → `GET /api/jobs/export-csv` → Electron save dialog

#### Step 5 — Job Detail
- `PostingHeader` shows title, company, location, "Open in Browser" link
- `ScoreGauge` renders animated circular gauges for Fit (0–10) and ATS (0–100%)
- Full job description in scrollable panel with matched keywords highlighted inline
- `KeywordPanel` lists matched (green) and missing (red) ATS keywords side by side
- "Tailor My Resume" → `POST /api/resume/tailor` → navigates to `/tailor`

#### Step 6 — Resume Tailoring
- Shows job context header (title + company)
- Tailored resume rendered in editable textarea (user can make manual tweaks)
- Before/after keyword diff shown below (ATS score delta)
- Export buttons: "Copy", "Save as DOCX", "Save as TXT" — Electron save dialog for file exports

---

### Modularity / Swap Points

| Component | Default | Swap Target | How to Swap |
|---|---|---|---|
| Web scraper | `bs4_scraper.py` | `serp_scraper.py` | 1 line in `backend/main.py` |
| AI provider | `anthropic_ai.py` | `openai_ai.py` | 1 line in `backend/main.py` |
| State management | Zustand | Any | Reimplement `lib/store.ts` |
| Styling | Tailwind + shadcn/ui | Any | CSS only |
| Scoring algorithm | TF-IDF (sklearn) | Embedding API | Reimplement `job_scorer.py` interface |

---

### IPC Surface (Electron ↔ Renderer)

Keep IPC minimal — only for things `fetch()` cannot do:

| Channel | Direction | Purpose |
|---|---|---|
| `dialog:openFile` | Renderer → Main | Native file open dialog (returns path) |
| `dialog:saveFile` | Renderer → Main | Native file save dialog (returns path) |
| `app:getConfigPath` | Renderer → Main | Returns path to config.json |
| `app:ready` | Main → Renderer | Python backend is up and accepting requests |

Everything else goes over `fetch()` to `http://localhost:7823`.

---

### Python Backend Startup & Health Check

`electron/pythonBridge.ts` logic:
1. On app ready: `spawn('python', ['backend/main.py', '--port', '7823'])`
2. Poll `GET http://localhost:7823/health` every 500ms until 200 OK (max 15s)
3. Send `app:ready` IPC to renderer once healthy
4. Renderer shows a loading screen until `app:ready` received
5. On app `will-quit`: kill the Python process

In packaged builds, Python path resolves to the bundled Python interpreter via `extraResources` in electron-builder config.

---

### Known Constraints & Backlog Notes

- **Web scraping**: LinkedIn blocks aggressively. BS4 scraper targets Indeed + Greenhouse/Lever public pages. SerpAPI (Google Jobs) is the recommended upgrade for production.
- **Python bundling**: Use `pyinstaller` to bundle the backend into a single executable for distribution, included as an Electron `extraResource`. This avoids requiring end users to have Python installed.
- **Port conflict**: Backend picks port 7823 by default; should fall back to a random available port and pass it via IPC if 7823 is taken.
- **Auto-fill backlog**: Blocked by per-site account creation, CAPTCHA, and token cost of AI form navigation. Scope v2 to Playwright-based Greenhouse/Lever automation only.
- **No database**: Sessions serialized to `backend/data/sessions/<timestamp>.json`. Zustand state is cleared on app restart unless a session is explicitly saved.

---

## PART 2: CURSOR PROMPT

Copy everything below the line into Cursor as your starting project prompt.

---

```
You are building "JobBot" — a self-contained Electron desktop application for job search
automation and resume tailoring. It requires no external hosting, no database, and no
internet connection beyond API calls. Users run it by launching a packaged desktop app.

---

## TECH STACK

### Electron Shell
- electron@latest
- electron-builder (packaging/distribution)
- TypeScript for all Electron main/preload code

### Frontend (Renderer)
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui component library
- Zustand for global state management
- next.config.js must set `output: 'export'` and `images: { unoptimized: true }`
- Do NOT use Next.js API routes, middleware, or SSR — static export only

### Backend (Python)
- FastAPI + uvicorn (runs as child process on localhost:7823)
- Python 3.10+
- All existing requirements.txt dependencies:
    requests>=2.31.0
    beautifulsoup4>=4.12.0
    scikit-learn>=1.3.0
    numpy>=1.24.0
    PyPDF2>=3.0.0
    python-docx>=1.0.0
- Add: fastapi>=0.110.0, uvicorn>=0.29.0, python-multipart>=0.0.9
- Optional: anthropic, openai (gated behind config check)

---

## PROJECT STRUCTURE

Create exactly this layout:

jobbot/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── electron-builder.yml
├── .gitignore                    ← must include config.json, .next/, out/, dist/
│
├── electron/
│   ├── main.ts                   ← Electron main process entry point
│   ├── preload.ts                ← Context bridge
│   └── pythonBridge.ts           ← Python child process manager
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Redirects to /resume
│   │   ├── resume/page.tsx
│   │   ├── search/page.tsx
│   │   ├── results/page.tsx
│   │   ├── posting/page.tsx
│   │   └── tailor/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── StepGuard.tsx
│   │   ├── resume/
│   │   │   ├── ResumeDropzone.tsx
│   │   │   └── SkillsPreview.tsx
│   │   ├── search/
│   │   │   ├── TagInput.tsx
│   │   │   └── SearchForm.tsx
│   │   ├── results/
│   │   │   ├── JobTable.tsx
│   │   │   └── ScoreBadge.tsx
│   │   ├── posting/
│   │   │   ├── PostingHeader.tsx
│   │   │   ├── KeywordPanel.tsx
│   │   │   └── ScoreGauge.tsx
│   │   └── tailor/
│   │       ├── TailoredResume.tsx
│   │       └── ExportButtons.tsx
│   └── lib/
│       ├── api.ts
│       ├── store.ts
│       └── types.ts
│
└── backend/
    ├── main.py                   ← FastAPI entry point
    ├── requirements.txt
    ├── config.json               ← gitignored
    ├── data/sessions/
    ├── core/
    │   ├── resume_parser.py
    │   ├── job_scorer.py
    │   ├── ats_scorer.py
    │   └── resume_tailor.py
    ├── scrapers/
    │   ├── base_scraper.py
    │   ├── bs4_scraper.py
    │   └── serp_scraper.py
    └── ai/
        ├── base_ai.py
        ├── anthropic_ai.py
        └── openai_ai.py

---

## ELECTRON MAIN PROCESS (electron/main.ts)

- Create a BrowserWindow (1200x800, minWidth 900, minHeight 600)
- In dev: load `http://localhost:3000`. In prod: load `out/index.html` (static export)
- On ready: call pythonBridge.start(), wait for health check, then show window
- Show a loading BrowserWindow with a spinner while Python starts up
- On will-quit: call pythonBridge.stop()
- Register IPC handlers:
  - `dialog:openFile` → dialog.showOpenDialog({ filters for pdf/docx/txt })
  - `dialog:saveFile` → dialog.showSaveDialog({ filters based on type arg })
  - `app:getConfigPath` → return path.join(app.getPath('userData'), 'config.json')

## electron/preload.ts

Expose exactly these methods via contextBridge under window.electronAPI:
```typescript
{
  openFile: () => Promise<string | null>,           // returns file path
  saveFile: (type: 'docx' | 'txt' | 'csv') => Promise<string | null>,
  getConfigPath: () => Promise<string>,
  onBackendReady: (cb: () => void) => void,         // listens for app:ready
}
```

## electron/pythonBridge.ts

```typescript
// Spawn: child_process.spawn('python', ['backend/main.py', '--port', '7823'])
// In packaged app: resolve python path from process.resourcesPath
// Health check: poll GET http://localhost:7823/health every 500ms, timeout 15s
// On healthy: send app:ready to all windows
// On exit: log exit code, show error dialog if non-zero and not user-initiated
// stop(): kill the child process
```

---

## PYTHON BACKEND (backend/main.py)

FastAPI app with CORS enabled for localhost origins. Routes:

### GET /health
Returns { "status": "ok" }. Used by Electron health check.

### POST /api/resume/parse
- Body: multipart/form-data with file field
- Parse file based on extension (.pdf, .docx, .txt)
- Return: ResumeData

### POST /api/jobs/search
- Body: { titles: list[str], companies: list[str], location: str }
- Call scraper.search(titles, companies, location)
- For each posting: compute fit_score + ats_score
- Return: list[ScoredJobPosting] sorted by fit_score desc

### GET /api/jobs/export-csv
- Query params: use last search result stored in app state
- Return: CSV file response

### POST /api/resume/tailor
- Body: { resume: ResumeData, posting: ScoredJobPosting }
- Call resume_tailor.tailor(resume, posting, ai)
- Return: { tailored_text: str, ats_score_before: float, ats_score_after: float }

### GET /api/config
- Read config.json from userData path (passed as env var JOBBOT_CONFIG_PATH by Electron)
- Return config (omit API key values, only return which keys are set as booleans)

### POST /api/config
- Write config.json

**Swap point**: `backend/main.py` instantiates the scraper and AI provider at startup.
These are the ONLY two lines that change when swapping providers:
```python
from scrapers.bs4_scraper import Bs4Scraper   # ← swap this import
from ai.anthropic_ai import AnthropicAI       # ← swap this import

scraper = Bs4Scraper()
ai_provider = AnthropicAI(config) if config.get("anthropic_api_key") else None
```

---

## PYTHON INTERFACES

### backend/scrapers/base_scraper.py
```python
from dataclasses import dataclass, field
from typing import Protocol

@dataclass
class JobPosting:
    title: str
    company: str
    location: str
    description: str
    url: str
    date_posted: str = ""

@dataclass
class ScoredJobPosting(JobPosting):
    fit_score: float = 0.0      # 0.0–10.0
    ats_score: float = 0.0      # 0.0–100.0

class BaseScraper(Protocol):
    def search(
        self,
        titles: list[str],
        companies: list[str],
        location: str
    ) -> list[JobPosting]: ...
```

### backend/ai/base_ai.py
```python
from typing import Protocol

class BaseAI(Protocol):
    def complete(self, system_prompt: str, user_prompt: str) -> str: ...
```

### backend/core/resume_parser.py
```python
# Returns TypedDict:
class ResumeData(TypedDict):
    raw_text: str
    skills: list[str]
    experience: list[str]
    education: list[str]
    filename: str
```

### backend/core/job_scorer.py
- Input: ResumeData + JobPosting
- Output: float 0.0–10.0
- TF-IDF cosine similarity (sklearn) between resume raw_text and posting description
- Scale cosine similarity (0–1) to 0–10

### backend/core/ats_scorer.py
- Input: ResumeData + JobPosting
- Output: float 0.0–100.0
- Extract keywords from job description: remove stopwords, retain nouns and technical terms
- Count matches found in resume raw_text
- Return (matched / total) × 100
- Also return: matched_keywords: list[str], missing_keywords: list[str]

### backend/core/resume_tailor.py
- Input: ResumeData, JobPosting, BaseAI
- Output: { tailored_text: str }
- System prompt: "You are an expert resume writer. Rewrite the provided resume to better 
  match the job description. Do not fabricate experience. Incorporate missing keywords 
  naturally. Preserve the candidate's voice. Return only the resume text."
- Pass resume raw_text + job description as user prompt

---

## SCRAPER IMPLEMENTATIONS

### backend/scrapers/bs4_scraper.py
Implements BaseScraper:
1. For each (title, company) combination:
   - Build Indeed search URL: https://www.indeed.com/jobs?q={title}+{company}&l={location}
   - GET with requests using a realistic User-Agent
   - Parse with BeautifulSoup, extract job cards
   - Follow each job link to get full description text
   - Build JobPosting dataclass
2. time.sleep(1.5) between requests
3. Catch all HTTP/parsing errors, log warning, continue
4. Return deduplicated list[JobPosting]

### backend/scrapers/serp_scraper.py
Stub class SerpScraper implementing BaseScraper.
search() raises NotImplementedError with message:
"SerpScraper not configured. Add serp_api_key to config.json and swap the import in main.py."

---

## AI IMPLEMENTATIONS

### backend/ai/anthropic_ai.py
- __init__(self, config: dict): load api_key from config["anthropic_api_key"]
- complete(system_prompt, user_prompt) → str
- Use anthropic SDK: client.messages.create(model="claude-sonnet-4-20250514", max_tokens=4096)

### backend/ai/openai_ai.py
Stub. __init__ and complete() both raise NotImplementedError.

---

## FRONTEND TYPES (src/lib/types.ts)

```typescript
export interface ResumeData {
  raw_text: string;
  skills: string[];
  experience: string[];
  education: string[];
  filename: string;
}

export interface JobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  date_posted: string;
}

export interface ScoredJobPosting extends JobPosting {
  fit_score: number;    // 0–10
  ats_score: number;    // 0–100
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface TailoredResult {
  tailored_text: string;
  ats_score_before: number;
  ats_score_after: number;
}

export type AppStep = 'resume' | 'search' | 'results' | 'posting' | 'tailor';
```

---

## FRONTEND STATE (src/lib/store.ts)

Zustand store with these slices:

```typescript
interface AppStore {
  // State
  backendReady: boolean;
  currentStep: AppStep;
  resume: ResumeData | null;
  searchConfig: { titles: string[]; companies: string[]; location: string };
  jobPostings: ScoredJobPosting[];
  selectedPosting: ScoredJobPosting | null;
  tailoredResult: TailoredResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBackendReady: (ready: boolean) => void;
  setResume: (resume: ResumeData) => void;
  setSearchConfig: (config: Partial<SearchConfig>) => void;
  setJobPostings: (postings: ScoredJobPosting[]) => void;
  setSelectedPosting: (posting: ScoredJobPosting) => void;
  setTailoredResult: (result: TailoredResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  navigateTo: (step: AppStep) => void;
}
```

---

## FRONTEND API CLIENT (src/lib/api.ts)

All backend calls go through this module. Base URL is `http://localhost:7823`.
Each function is typed with full request/response types.

```typescript
export const api = {
  parseResume: (file: File) => Promise<ResumeData>,
  searchJobs: (config: SearchConfig) => Promise<ScoredJobPosting[]>,
  tailorResume: (resume: ResumeData, posting: ScoredJobPosting) => Promise<TailoredResult>,
  exportCsv: () => Promise<Blob>,
  getConfig: () => Promise<ConfigStatus>,
  saveConfig: (config: Partial<Config>) => Promise<void>,
}
```

---

## FRONTEND PAGES

### src/app/layout.tsx
- Root layout wrapping all pages
- Renders `<Sidebar />` on the left (fixed width 220px)
- Main content area on the right, scrollable
- Shows a full-screen loading overlay until `store.backendReady` is true
- Loading overlay: centered spinner + "Starting JobBot..." text

### src/app/resume/page.tsx + ResumeDropzone.tsx
- Drag-and-drop zone accepting .pdf, .docx, .txt
- "Browse" button triggers window.electronAPI.openFile()
- On file selected: POST to /api/resume/parse, store result, mark step complete
- SkillsPreview: renders skills as pill badges in a wrapping flex container
- Show count: "X skills detected"

### src/app/search/page.tsx + SearchForm.tsx + TagInput.tsx
- TagInput: text input + Enter/comma to add tag, × button on each tag chip to remove
- One TagInput for companies, one for job titles
- Location input (text, default "Remote") + "Remote Only" toggle
- "Run Job Search" button: calls api.searchJobs(), shows spinner overlay during search
- On success: navigate to /results

### src/app/results/page.tsx + JobTable.tsx + ScoreBadge.tsx
- Table with sortable columns (click header to sort): Fit Score, ATS Score, Title, Company, Location, Date Posted
- ScoreBadge: colored pill — green (≥7 fit / ≥70% ATS), amber (4–6 / 40–69%), red (<4 / <40%)
- Row click: setSelectedPosting + navigate to /posting
- "Export CSV" button: calls api.exportCsv() + window.electronAPI.saveFile('csv')
- Empty state if no results

### src/app/posting/page.tsx + components
- StepGuard: redirect to /results if no selectedPosting
- PostingHeader: title, company, location as large text; "Open in Browser" link
- Two ScoreGauge components (circular SVG progress rings):
  - Fit Score: 0–10 scale, labeled "Resume Fit"
  - ATS Score: 0–100% scale, labeled "ATS Match"
- Job description panel: full text, with matched keywords highlighted in green via <mark>
- KeywordPanel: two columns — "Matched Keywords" (green chips) | "Missing Keywords" (red chips)
- "Tailor My Resume" button: calls api.tailorResume(), shows loading state, navigates to /tailor

### src/app/tailor/page.tsx + components
- StepGuard: redirect to /posting if no tailoredResult
- Header: "Tailored for: {title} at {company}"
- ATS score delta: "ATS Score: {before}% → {after}%" with green arrow if improved
- TailoredResume: large editable <textarea> pre-populated with tailored_text
- ExportButtons:
  - "Copy to Clipboard": navigator.clipboard.writeText()
  - "Save as DOCX": POST tailored text to backend save endpoint + electronAPI.saveFile('docx')
  - "Save as TXT": electronAPI.saveFile('txt') + write file

---

## SIDEBAR (src/components/layout/Sidebar.tsx)

Steps listed vertically:
1. Upload Resume
2. Search Config
3. Results
4. Job Detail
5. Tailor Resume

Each step shows:
- Step number circle (filled/outlined based on completion)
- Step label
- Checkmark if step is complete

Steps are not clickable unless the prerequisite step is complete:
- Step 2 requires: resume loaded
- Step 3 requires: search has been run
- Step 4 requires: a posting is selected
- Step 5 requires: tailoring has been run

---

## CONFIG FILE

Config file path is provided to the Python process via env var JOBBOT_CONFIG_PATH.
Electron sets this env var before spawning Python.

config.json format:
```json
{
  "anthropic_api_key": "",
  "openai_api_key": "",
  "serp_api_key": "",
  "scraper": "bs4",
  "ai_provider": "anthropic",
  "default_location": "Remote"
}
```

On first run, if config.json doesn't exist, create it with empty values.
A settings modal (accessible from sidebar footer gear icon) lets user enter API keys.
The frontend calls GET /api/config to check which keys are set (never expose key values to renderer).

---

## CODING STANDARDS

### TypeScript / React
- Strict TypeScript throughout (no `any`)
- All components use named exports except page.tsx files (default export)
- Use React Query or plain useState+useEffect for loading states — no mixing
- Never call fetch() directly in components — always use src/lib/api.ts functions
- Handle loading and error states in every page that fetches data

### Python
- Type hints and docstrings on all public functions and classes
- FastAPI dependency injection for scraper and AI provider
- All scraper/AI errors caught and returned as HTTPException with appropriate status codes
- Use asyncio-compatible patterns: run blocking scraper calls in asyncio.to_thread()
- Logging via Python logging module, INFO level, timestamp format

### General
- The swap between scraper and AI provider requires changing EXACTLY ONE import line each in backend/main.py
- The app must be fully usable through Step 5 (ATS scoring) with zero API keys configured
- Step 6 (tailoring) shows a clear "Configure an AI provider in Settings to use this feature" message if no AI key is set

---

## PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron .\"",
    "build": "next build && electron-builder",
    "build:next": "next build",
    "electron:dev": "electron .",
    "python:dev": "cd backend && uvicorn main:app --port 7823 --reload"
  }
}
```

---

## WHAT NOT TO DO
- Do NOT use Next.js API routes, getServerSideProps, or middleware (static export only)
- Do NOT use localStorage or sessionStorage (use Zustand)
- Do NOT call the Python backend from Electron main process — only the renderer does that via fetch()
- Do NOT expose the entire electron API through the context bridge — only the 4 methods listed
- Do NOT hardcode API keys anywhere
- Do NOT use a database
- Do NOT add IPC channels for things that can be done with fetch() to the Python backend

---

## DELIVERABLE ORDER

Build in this order — each phase is independently runnable/testable:

Phase 1 — Scaffold
  - Full project structure with all files as stubs
  - package.json with all deps, next.config.js, tsconfig.json, tailwind.config.ts
  - Verify: `npm run dev` launches Electron with a blank Next.js page

Phase 2 — Python Backend Core
  - backend/main.py with all routes returning stub data
  - core/resume_parser.py (real implementation)
  - scrapers/bs4_scraper.py (real implementation)
  - core/job_scorer.py + core/ats_scorer.py (real implementation)
  - Verify: `npm run python:dev`, curl the endpoints manually

Phase 3 — Electron Shell
  - electron/main.ts, preload.ts, pythonBridge.ts
  - Loading screen while Python starts
  - File dialog IPC handlers
  - Verify: Electron launches, spawns Python, loading screen resolves

Phase 4 — Frontend Pages (in pipeline order)
  - lib/types.ts, lib/store.ts, lib/api.ts
  - Sidebar + layout
  - /resume page
  - /search page
  - /results page
  - /posting page
  - /tailor page
  - Verify: full end-to-end flow with real resume file

Phase 5 — AI Integration
  - ai/anthropic_ai.py (real implementation)
  - core/resume_tailor.py (real implementation)
  - Settings modal for API key entry
  - Verify: tailor flow produces real output

Phase 6 — Polish & Packaging
  - Error boundaries on all pages
  - Empty states and loading skeletons
  - electron-builder config for .exe/.app/.deb output
  - Verify: `npm run build` produces distributable
```

---

## PART 3: QUICK-START NOTES FOR CURSOR

- Start with **Phase 1 scaffold only** — ask Cursor to create all files with typed stubs before writing any real logic. This gives you a working dev environment to test each phase against.
- When you get to the scraper, tell Cursor: *"Implement bs4_scraper.py to the BaseScraper Protocol — do not modify the Protocol or any other file."*
- When you're ready to swap providers: *"Replace the scraper import in backend/main.py with SerpScraper. Do not change any other file."*
- The `JOBBOT_CONFIG_PATH` env var pattern means the Python process always knows where to find config regardless of OS or install location — make sure Cursor sets this in `pythonBridge.ts` before spawning.
- For packaging, tell Cursor to use `electron-builder` with `extraResources` pointing at a PyInstaller-bundled `backend.exe` / `backend` binary so end users don't need Python installed.
- Add `config.json`, `.next/`, `out/`, `dist/`, `__pycache__/` to `.gitignore` on day one.
