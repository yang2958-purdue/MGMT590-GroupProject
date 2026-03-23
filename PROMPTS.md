# Project Prompts Log

## 2026-03-11 - JobBot Full Implementation Plan

**Prompt:** Implement the JobBot plan as specified (Electron + Next.js + FastAPI desktop app for job search automation and resume tailoring). Build in six phases: Scaffold, Python backend core, Electron shell, Frontend pages, AI integration, Polish and packaging.

**Outcome:** Full implementation completed: project scaffold, resume parser (PDF/DOCX/TXT), BS4 Indeed scraper, TF-IDF and ATS scorers, Electron main/preload/pythonBridge with health check and IPC (openFile, saveFile, getConfigPath, readFile, writeFile), all frontend pages (resume, search, results, posting, tailor), Sidebar and StepGuard, Anthropic AI integration and resume_tailor, Settings page for API keys, error boundary, electron-builder config, README.

## 2026-03-12 - Electron dev app stuck on loading

**Prompt:** The application gets stuck on the loading screen when starting the Electron application from the command line using `npm run dev`.

**Outcome:** Investigated Electron `main` and `pythonBridge` startup flow; confirmed backend health checks succeed and `app:ready` is emitted. Diagnosis: loading screen persistence is cosmetic while main window is active; recommend checking behind the loading window or adjusting loading window close logic if desired.

## 2026-03-12 - Add console logging to preload and layout

**Prompt:** Add console logging to `preload.ts` and `layout.tsx`.

**Outcome:** Added verbose console logging around Electron preload IPC APIs (`openFile`, `saveFile`, `getConfigPath`, `onBackendReady`, `readFile`, `writeFile`) and lifecycle events, plus logging in `RootLayout` to trace backend readiness detection, health check behavior, and config loading.

## 2026-03-12 - Add console logging to electron main

**Prompt:** Add the console logging to `electron/main.ts`.

**Outcome:** Added detailed logging in `main.ts` around Electron app readiness, loading and main window creation, python bridge startup, `did-finish-load`/`ready-to-show` events, and the `app:ready` IPC send to correlate backend startup with the renderer's backendReady state.

## 2026-03-12 - Fix missed app:ready event

**Prompt:** Diagnose terminal output where `main` logs `app:ready` being sent but the Electron renderer never receives it and the loading screen stays stuck.

**Outcome:** Identified a race where `app:ready` was sent before `RootLayout` registered `onBackendReady`. Updated `preload.ts` to track a `backendReady` flag and queue callbacks, invoking them immediately if the event already fired so the frontend reliably exits the loading state.

## 2026-03-12 - Resume skills detection behavior

**Prompt:** The page is showing zero skills detected when uploading a resume in step 1. How are skills detected from the resume and will the page show what skills are found if it can find them?

**Outcome:** Investigated `backend/core/resume_parser.py` and `src/app/resume/page.tsx`. Skills are parsed from the resume text by looking for common "Skills" section headers and splitting lines on commas/bullets, with a fallback that treats short comma-separated phrases as skills if no explicit section is found. The frontend passes the returned `skills` array into `SkillsPreview`, which shows the count (`X skills detected`) and renders each detected skill as an individual pill chip.

## 2026-03-12 - DOCX resume with table-based skills not detected

**Prompt:** A specific DOCX resume (`RyanYang_Resume_PurdueTech.docx`) has a clearly labeled skills section but the app detects zero skills.

**Outcome:** Determined that `_extract_text_docx` only read paragraph text and ignored table cells, which is where many resumes (including this one) store skills. Updated DOCX extraction to also traverse all tables and append unique cell text, so skills stored in tables are included in the raw text and can be picked up by the section heuristics.

## 2026-03-23 - Browser Extension Scaffold and First Working Slice

**Prompt:** Pivot from Electron desktop app to a Manifest V3 browser extension for Chromium and Firefox. Scaffold the full directory structure with all module files containing exported function signatures, JSDoc comments, and stub implementations. Implement the resume parser (modules/resumeParser.js) and the storage wrapper (modules/storage.js) in full. Implement the Python Flask scraper server with beautifulsoup_adapter.py as a working mock stub that returns mock job postings for any query.

**Outcome:** Created complete browser extension scaffold: manifest.json (MV3 with Chrome sidePanel + Firefox sidebar_action), Vite build config with multi-entry (sidepanel, service worker, content script), side panel UI with hash router and 5 pages (upload, target, results, detail, settings) plus 9 components (nav, resumeUpload, companyAutocomplete, tagInput, filterControls, jobTable, detailPanel, keywordGap, pauseBanner). Fully implemented resumeParser.js (PDF via pdfjs-dist, DOCX via mammoth, contact/skills/experience/education extraction), storage.js (chrome.storage.local wrapper with typed accessors and backlog hooks). Created module stubs for jobScraper.js, scorer.js (keyword overlap with SWAP comment), tailor.js (keyword diffing with SWAP comment), autofill.js. Built Python Flask scraper server at localhost:5001 with adapter pattern: base_adapter.py ABC, beautifulsoup_adapter.py returning 5 realistic mock postings per query, firecrawl_adapter.py stub. Startup scripts for Windows and Unix.

## 2026-03-23 - Debug and fix extension UI and data flow

**Prompt:** Debug issues where resume data was not retained across page navigations, company autocomplete and tag input were non-functional stubs, and the "Run Job Search" button had no handler.

**Outcome:** Diagnosed via runtime logging instrumentation (extension JS → Flask /debug-log endpoint → NDJSON log file). Fixed storage.js to use `globalThis.browser || globalThis.chrome` directly instead of webextension-polyfill. Implemented uploadPage.js to restore stored resume on render. Fully implemented companyAutocomplete.js (fuzzy match, suggestions dropdown, tag chips), tagInput.js (Enter/comma add, Backspace remove), filterControls.js (_getFilters accessor). Wired targetPage.js search button to orchestrate: collect inputs → scrapeJobs → scoreJob → setResults → navigate to results. Implemented jobTable.js (sortable table with score badges, row click → detail page) and detailPanel.js/keywordGap.js (job detail with highlighted description and keyword gap analysis). All issues confirmed fixed by runtime logs showing end-to-end pipeline: resume upload/parse/store → restore on revisit → company/title input capture → scrape 5 results → score (topFit 3.5, topAts 35) → results page render.
