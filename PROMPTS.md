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

## 2026-03-23 - Firecrawl-Powered Single-Page Form Autofill

**Prompt:** Implement Firecrawl-powered form field extraction and single-page autofill pipeline. Add config files, a Firecrawl adapter with mock mode, a field mapper, an autofill controller, content script DOM filling, and a pause/resume/skip UI in the side panel. All Firecrawl calls go through a single adapter using raw fetch (no SDK dependency). Mock mode enabled by default for development without an API key.

**Outcome:** Created 8 new files and modified 6 existing files. Config: `src/config/firecrawl.config.js` (API key, base URL, USE_MOCK flag) and `src/config/autofill.config.js` (FILL_DELAY_MS, PAUSE_TRIGGER_KEYWORDS). Firecrawl adapter: `src/modules/scraper/firecrawlAdapter.js` with `scrapePageContent` and `extractFormFields` using raw fetch to Firecrawl REST API v1, mock mode returning 13 realistic form fields. Field mapper: `src/modules/autofill/fieldMapper.js` pure function mapping FormFields to FilledFields with ready/skipped/pause_required statuses based on resume data lookup and pause-trigger keyword matching. Autofill controller: `src/modules/autofill/autofillController.js` orchestrating tab creation, Firecrawl extraction, field mapping, and content script messaging. Field filler: `src/modules/autofill/fieldFiller.js` with sequential DOM filling, field highlighting, React/Angular-compatible value injection, and pause/resume coordination via Promise-based hooks. Updated `src/content/content.js` to import fieldFiller and handle FILL_FIELDS, RESUME_AUTOFILL, SKIP_FIELD, PAUSE_AUTOFILL messages. Autofill UI: `src/sidepanel/pages/autofillPage.js` and `src/sidepanel/components/autofillPanel.js` with progress bar, status indicator, and pause/resume/skip buttons. Wiring: added `#/autofill` route to app.js, "Start Autofill" button to detailPage.js, autofill state storage key to storage.js, host_permissions and tabs permission to manifest.json. Deleted superseded `src/modules/autofill.js`. Cleaned up service-worker.js stubs.

## 2026-03-23 - Swap BeautifulSoup Scraper for JobSpy

**Prompt:** Replace the mock BeautifulSoup scraper with JobSpy as the active adapter. Keep the existing adapter pattern, BeautifulSoup as fallback, and raw-array response format. Add JobSpy config block, per-source error isolation, and expanded JobPosting schema with backward-compatible `salary` string field.

**Outcome:** Added `python-jobspy` to `python-server/requirements.txt`. Updated `python-server/config.py` with `ACTIVE_ADAPTER = "jobspy"` and `JOBSPY_CONFIG` block (site_names including indeed/linkedin/glassdoor/google/zip_recruiter, results_wanted: 20, hours_old: 72, description_format: markdown, linkedin_fetch_description: True) with comments about LinkedIn rate limiting. Expanded `base_adapter.py` schema docs with new fields (id, job_type, is_remote, salary_min, salary_max, salary_currency, source). Created `python-server/adapters/jobspy_adapter.py` with criteria merging over config defaults, jobspy call, DataFrame-to-dict normalization, deterministic MD5 id generation, salary string synthesis from min/max, and per-source error isolation. Updated `python-server/server.py` adapter loader to include jobspy with if/elif pattern and A/B testing TODO. Verified: jobspy adapter returned 40 real job postings with all schema fields populated; beautifulsoup fallback confirmed working by switching ACTIVE_ADAPTER.

## 2026-03-23 - Fix Resume Upload Persistence UX

**Prompt:** The resume parser no longer retains the parsed content from uploaded resumes after switching tabs of the extension. The stored resume stays and exists even on reloads or instances where a resume file has not yet been uploaded.

**Outcome:** Root cause identified via runtime logging: `chrome.storage.local` was correctly storing and retrieving data, but the upload page had two separate preview areas (`#upload-status` for fresh uploads, `#resume-preview` for stored data) creating a confusing UX. Stale data from previous sessions persisted with no way to clear it. Fix: unified the resume display into a single component in `resumeUpload.js` that checks storage on load — if a stored resume exists, shows it as a card with "Upload New" and "Remove" buttons; otherwise shows the dropzone. Removed the redundant `#resume-preview` section from `uploadPage.js`. Added `btn-sm` and `btn-danger` CSS classes to `app.css`. Added HTML escaping for user-provided data in the preview template.

## 2026-03-23 - Enforce Company and Title Filters in JobSpy

**Prompt:** The job search step ignores company filters and defaults to broad Software Engineer searches. Update the job scraper so company/title filters are enforced.

**Outcome:** Updated `python-server/adapters/jobspy_adapter.py` to remove single-title placeholder behavior and properly enforce user filters. The adapter now: (1) normalizes `titles` and `companies`, (2) builds one or more JobSpy search terms from title/company combinations, (3) executes multiple searches when needed, (4) merges and de-duplicates results by posting id, and (5) applies strict post-filtering so returned jobs must match selected company/title filters. Updated `src/sidepanel/pages/targetPage.js` to stop injecting placeholder criteria (`['Software Engineer']`, `['Company']`) and send only actual user input. Verified with `python -m py_compile` for adapter syntax and `npx vite build` for extension build.

## 2026-03-23 - Fix Python Server Startup Dependency Conflict

**Prompt:** The Python scraper server fails to start on Windows due to numpy DLL load errors and Application Control policy blocks.

**Outcome:** Fixed dependency install flow in `python-server/start_server.bat` and `python-server/requirements.txt`. Removed `python-jobspy` from `requirements.txt` to prevent pip from pulling pinned `numpy==1.26.3` during base install. Updated `start_server.bat` to install `python-jobspy` with `--no-deps`, then explicitly install/upgrade compatible dependencies (`numpy>=2.0`, `pandas>=2.2`, `tls-client`, `regex`, `markdownify`, `pydantic>=2.0`) and upgraded pip first. Updated `README.md` to document the Windows startup script behavior.

## 2026-03-23 - Enable Live Firecrawl Key for Autofill Debug

**Prompt:** Provided live Firecrawl API key and requested autofill debugging with real extraction instead of mock mode.

**Outcome:** Updated `src/config/firecrawl.config.js` with the provided API key and switched `USE_MOCK` to `false` so the autofill pipeline uses live Firecrawl extraction. Rebuilt extension (`npx vite build`) to activate the new config for runtime debugging.

## 2026-03-23 - Firecrawl 403 on LinkedIn + DOM fallback

**Prompt:** Autofill shows Firecrawl extract error 403: site not supported (LinkedIn).

**Outcome:** Confirmed Firecrawl blocks remote extract for LinkedIn. Added `shouldSkipRemoteExtract()` in `firecrawlAdapter.js` to skip API calls for `linkedin.com`. Implemented `domFieldScanner.js` and `EXTRACT_FIELDS_DOM` message in `content.js` so the controller falls back to scanning the **opened tab’s** DOM when Firecrawl is skipped or fails. Updated `autofillController.js` to chain remote extract → DOM scan → clear error if no fields. Moved API key to `VITE_FIRECRAWL_API_KEY` via `.env.local` / `.env.example` (removed hardcoded secret). Extended `fieldFiller.js` for checkbox/radio. Documented behavior in `README.md`.

## 2026-03-23 - Remove Autofill Debug Instrumentation

**Prompt:** Autofill issue fixed; remove debug instrumentation.

**Outcome:** Removed all `fetch`/`127.0.0.1:7526` debug logs from `autofillController.js`, `content.js`, `fieldFiller.js`, and `firecrawlAdapter.js`. Dropped unused `newTabId` follow-up after apply-entry. Rebuilt extension with `npx vite build`.

## 2026-03-23 - Autofill from active application tab

**Prompt:** Change autofill so it is triggered from the side panel when the user is already on the external application page (e.g. Workday), not from the scraped job listing via Start Autofill.

**Outcome:** Refactored `autofillController.js`: added `startAutofillOnActiveTab()` and `runAutofillPipeline(tabId, pageUrl)`; removed `startAutofill(job)` tab creation and LinkedIn apply-entry. Removed `CLICK_APPLY_ENTRY` handling from `content.js`. Reworked `autofillPage.js` with active-tab preview, Refresh, **Autofill this tab**, and Back to Results. Updated `detailPage.js` to **Open job posting** only plus hint to use Autofill nav. Added **Autofill** to `nav.js`. Updated `README.md` autofill description.

## 2026-03-24 - Autofill mapping and select/radio filling

**Prompt:** Autofill fills wrong values (e.g. phone into a yes/no dropdown) and skips many fields.

**Outcome:** Added `fieldInference.js` for shared label/type heuristics; DOM scan uses it instead of defaulting to `commonAnswers.custom`. `fieldMapper.js` now tries multiple keys (suggested + inferred), rejects phone/email/long text on choice controls, expands profile lookup (`authorizedToWork`, location fields, etc.), and improves work-authorization derivation. `fieldFiller.js` implements `<select>` option matching (including yes/no wording) and full **radio group** selection by name. Documented optional profile keys in `README.md`.

## 2026-03-24 - Expand user profile Settings and resume overrides

**Prompt:** Implement profile expansion: schema, resume overrides (profile over parser), custom keys UI, and wire Settings load/save.

**Outcome:** Extended `UserProfile` / `ResumeFieldOverrides` in `storage.js`. `fieldMapper.js` applies `resumeOverrides` after resume merge, normalizes sponsorship Yes/No, trims profile strings. Rebuilt `settingsPage.js` with application answers, contact/location, resume correction fields, dynamic custom Q&A rows, **Save profile** → `setUserProfile`, load via `getUserProfile`, and scraper **/health** status. Router in `app.js` awaits async settings render. Added layout/CSS helpers and README section **User profile (Settings)**. Logged in `PROMPTS.md`.

## 2026-03-25 - Autofill DOM scan: inject retry + host permission

**Prompt:** (Debug) Field detection still failing after programmatic content-script inject; logs showed `executeScript` blocked without host permission.

**Outcome:** Logs confirmed `chrome.scripting.executeScript` failed with “Extension manifest must request permission to access this host.” Added `<all_urls>` to `host_permissions` in `manifest.json` (alongside Firecrawl). Kept `tabSendMessageWithContentScriptFallback` and content-script duplicate guard; debug ingest logs remain until verification. README Architecture note updated.

## 2026-03-25 - DOM scan: same-origin iframe fields

**Prompt:** (Debug) Still zero fields on Lilly/Phenom apply page after inject + permission fixes.

**Outcome:** Implemented recursive scan into same-origin `iframe` documents in `domFieldScanner.js` (`iframePath` on `FormField`). `fieldFiller.js` resolves the leaf `Document` via `iframePath` for `setFieldValue` / highlight. `inferLabel` uses `ownerDocument` for queries. `firecrawlAdapter.js` typedef updated. Added H7 ingest log for `hasIframePath` / total field count. README updated.

## 2026-03-25 - Autofill: all-frames probe + targeted messaging

**Prompt:** Does autofill only work on specific sites (e.g. Workday)? Lilly careers still shows zero fields.

**Outcome:** Clarified there is no vendor allowlist; UI examples are illustrative. Completed `requestDomFieldScan` using `executeScript` `{ allFrames: true }` to count fillable controls per frame, inject `content/content.js` into frames with inputs (descending count), and return `{ fields, frameId }`. Extended `tabSendMessageWithContentScriptFallback` with `injectFrameId` and `skipInitialSend`; `runAutofillPipeline` stores `contentFrameId` on filling state and passes it for `FILL_FIELDS`, pause, resume, and skip. H8 probe ingest log in `requestDomFieldScan`. Rebuilt with `npm run build`.

## 2026-03-25 - Content script IIFE for programmatic inject

**Prompt:** Issue reproduced (proceed after logs).

**Outcome:** Logs showed H8 probe n=27 on frame 0 but H1/H6 never connected (`Receiving end does not exist` after inject). Root cause: main Vite bundle emitted `content/content.js` as an ES module with `import` from `chunks/`, while `chrome.scripting.executeScript({ files })` loads as a classic script, so the listener never registered. Added `vite.content.config.js` second build (`inlineDynamicImports`, `format: 'iife'`) and `npm run build` runs both steps. Treat `frameId === 0` as main frame (omit `tabs.sendMessage` `frameId`; inject with `{ tabId }` only). Debug instrumentation kept for verification.

## 2026-03-25 - Remove autofill debug instrumentation (post-fix)

**Prompt:** Issue fixed; clean up instrumentation.

**Outcome:** Removed all `fetch`/`127.0.0.1:7526` debug logs and `#region agent log` blocks from `autofillController.js`, `content.js`, and `domFieldScanner.js`. Simplified `tabSendMessageWithContentScriptFallback` `sendOnce` (no logging-only parameters). Rebuilt with `npm run build`.

## 2026-03-23 - Match GitHub ryanbranch

**Prompt:** update my code to match this branch https://github.com/yang2958-purdue/MGMT590-GroupProject/tree/ryanbranch

**Outcome:** Fetched remotes, switched local workspace to `ryanbranch`, and hard-synced to `origin/ryanbranch` so files match branch commit `b7561dd`.

## 2026-03-23 - Verify Local Files Updated

**Prompt:** can we make sure that these files are correctly updated on my pc

**Outcome:** Verified local branch/commit against `origin/ryanbranch` and checked expected branch file structure (`manifest.json`, `src/`, `python-server/`, `package.json`). Found local deltas only in `PROMPTS.md` and untracked `PDF_RESUME_GUIDE.md`.

## 2026-03-23 - Add Resume Parser Debug Matrix

**Prompt:** lets create a debug window that displays all the info that is parsed form the resumes, lets create a "matrix" of info we would want to be filled like name, last name, phone, etc and fill those with what the code believes is each

**Outcome:** Added a toggleable debug matrix in the resume upload preview that shows parser outputs and derived values (full name, first/last name, email, phone, latest role/company, latest degree/school, top skills) with detected/missing status. Added matching styles to side panel CSS.

## 2026-03-23 - Add Autofill Key Mapping Column

**Prompt:** lets do that

**Outcome:** Extended the resume debug matrix to include an "Autofill Key" column using the same lookup keys used by autofill mapping (`name`, `firstName`, `lastName`, `email`, `phone`, `workExperience[0].title`, `workExperience[0].company`, `education[0].degree`, `education[0].school`, `skills`). Updated matrix styling for the additional column.

## 2026-03-23 - Add Debug Tab in Ribbon

**Prompt:** make sure its another tab, after settings on the ribbion, call its "Debug"

**Outcome:** Added a new `Debug` tab to the top navigation immediately after `Settings`, wired route `#/debug`, and created `src/sidepanel/pages/debugPage.js` to render a dedicated parsed resume matrix (field, autofill key, parsed value, detected/missing). Updated README page list to include Debug.

## 2026-03-23 - Fix Workday Name/Phone Misfill

**Prompt:** This is the info that is getting pulled up ... middle name uses full name, last name includes middle initial, and phone repeats into postal/other fields.

**Outcome:** Tightened autofill mapping/inference for Workday-style forms: added `middleName` inference and lookup support, corrected name splitting to first/middle/last, and added mismatch guards to prevent phone values from filling postal code, phone extension, and phone-country-code inputs. Improved skill parsing filters to drop contact/location noise from skills output. Added middle-name row to debug matrix and verified build success.

## 2026-03-23 - Enforce Token-Based Name Splitting

**Prompt:** lets make sure that for the name, that 2nd token=middle name, because some people might not have a middle name, so put some logic in where the code will look at the whole name, and identify the first and last tokens as first and last name, and any in between as middle names

**Outcome:** Updated full-name override handling in `fieldMapper` to always use token-based split logic (`first token -> firstName`, `last token -> lastName`, intermediate tokens -> `middleName`) instead of assigning all trailing tokens to last name.

## 2026-03-23 - Confirm Dropdown Support

**Prompt:** can the code handle drop down menus?

**Outcome:** Confirmed dropdown/select support exists in scanner, mapper, and filler paths (`domFieldScanner` identifies `select`, `fieldInference` maps select/radio labels to keys, and `fieldFiller` matches/selects `<option>` values with yes/no-aware fallback).

## 2026-03-23 - Hardcode Workday Phone Dropdown Defaults

**Prompt:** lets hard code for the "Phone Device Type" drop down always put "Mobile" and the "Country / Territory Phone Code" drop down always put "United States of America (+1)"

**Outcome:** Added label-based hardcoded select overrides in `fieldMapper` so autofill forces `Mobile` for "Phone Device Type" and `United States of America (+1)` for "Country / Territory Phone Code" before normal key lookup.

## 2026-03-23 - Improve Dropdown Interaction Reliability

**Prompt:** the extension seems to be failing to interact with drop down menus, how would we fix that?

**Outcome:** Added robust dropdown handling for both native `<select>` and custom ARIA/listbox combobox widgets: scanner now detects combobox/button-listbox controls as `select`, filler now awaits field set operations, and custom combobox fill logic opens dropdowns, types when editable, and selects matching options from role/data-automation option lists with retry.

## 2026-03-23 - Fix Phone Device Type + Show Previous Jobs

**Prompt:** the "Phone Device Type" is still not being changed, also lets make sure that previous jobs are correctly being parced, and are added to the debug page

**Outcome:** Strengthened hardcoded phone dropdown matching to use combined field context (label/selector/suggested key) for better detection of Workday variants, and expanded Debug page to include a full parsed work-experience table listing all detected jobs (title/company/dates/bullet count), not only the latest job.

## 2026-03-23 - Workday Dropdown Container Fix

**Prompt:** , still not effecting, here is a screen shot (let me know if this is what you need)

**Outcome:** Implemented a stronger dropdown filler path for Workday-style widgets where selectors target container `div`s: if field type is `select`, filler now resolves real dropdown controls from nearby DOM (combobox/button/listbox/select) and selects options from expanded listbox items with broader selector patterns and normalized text matching.

## 2026-03-23 - Fix City/State Parse + Dropdown Open

**Prompt:** its still not properly opening the drop down, but there also appears to be an issue where the data is not properly parsing my home state and city, but that info is clearly stated at the top of the resume, can we fix these 2 things

**Outcome:** Added header location parsing in resume parser (`city/state/zip`) and surfaced those on Debug + lookup fallback for autofill (`commonAnswers.city/state/zip`). Strengthened combobox open flow with mouse + keyboard events and repeated reopen attempts while waiting for option rendering.

## 2026-03-23 - Improve Company Extraction in Experience

**Prompt:** lets also make sure under the "Professional Experience" section of the resume (or any similar from differnet resumes) correctly identify the company,

**Outcome:** Upgraded experience parsing heuristics to better capture company names in multi-line Professional Experience formats (title/company/date on separate lines). Added context-aware header parsing around date lines, company-line detection/cleanup (including `Company | City, ST` patterns), and buffering of short header-like lines for subsequent date-bound entries.
