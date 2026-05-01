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

## 2026-03-23 - Add ChatGPT Resume Parsing Wrapper

**Prompt:** lets try and use chatgpt to parse the data, make any code changes nesseary and give me a step by step on things I need to do to set it up

**Outcome:** Added hybrid resume parsing: sidepanel now runs heuristic parse, then calls local Python endpoint `/parse-resume-llm` for ChatGPT enhancement and merges results with fallback. Implemented OpenAI-backed parser endpoint in `python-server/server.py` with normalization/validation, added `src/modules/llmResumeParser.js`, exposed parser source in Debug matrix, and documented setup steps/env vars in README.

## 2026-03-23 - Expand Step 2 Setup Detail

**Prompt:** can you go into deeper detail for step 2

**Outcome:** Provided detailed Windows setup for Step 2 (environment variables + server startup), including verification commands, session-scope behavior, persistence options, and troubleshooting guidance.

## 2026-03-23 - Fix PowerShell start_server.bat Command

**Prompt:** got an this error on step 2.5 start_server.bat : The term 'start_server.bat' is not recognized...

**Outcome:** Clarified PowerShell execution behavior and provided corrected command invocation using `.\start_server.bat` (or full path / `cmd /c`) from the `python-server` directory.

## 2026-03-23 - Fix Windows pip self-upgrade in startup script

**Prompt:** is this acceptable? [pip notices + ERROR: To modify pip, run python -m pip ...]

**Outcome:** Updated `python-server/start_server.bat` to use `python.exe -m pip` for pip upgrades and package installs, preventing pip self-modification failure in newer pip versions.

## 2026-04-01 - Verify Python server startup output

**Prompt:** Starting scraper server on port 5001... [Flask startup logs]

**Outcome:** Confirmed server startup output is healthy (adapter loaded, Flask running at `http://127.0.0.1:5001`, debug reloader active). Provided next-step checks to validate LLM parsing in extension.

## 2026-04-01 - Diagnose heuristic fallback after setup attempts

**Prompt:** parser source still shows heuristic

**Outcome:** Diagnosed PowerShell command issues from terminal history: missing `.\` prefix for batch execution, unquoted API key assignment causing command parsing errors, and duplicate `cd python-server` while already in that directory. Provided corrected copy/paste command sequence and verification checks.

## 2026-04-01 - Diagnose OpenAI quota error on verify step

**Prompt:** got this on the 2nd terminal verify [OpenAI error 429 insufficient_quota]

**Outcome:** Confirmed local wrapper is functioning end-to-end and reaching OpenAI; failure is external quota/billing (`insufficient_quota`). Provided remediation steps (billing/quota check, new key, or fallback parser usage).

## 2026-03-23 - Improve Workday My Experience field interaction

**Prompt:** let me know if you can read this site page ... code the bot to properly interact with fields (mainly dates and skills dropdown)

**Outcome:** Enhanced autofill behavior for Workday "My Experience" controls by adding targeted handlers in `src/modules/autofill/fieldFiller.js` for split month/year date widgets and skills multi-select input flow (type, option select/Enter, change/blur events) so date and skills entries are more reliably applied.

## 2026-03-23 - Ensure skills are committed one-by-one

**Prompt:** on the skills, it appears that the bot is imputing the skills without actually adding them, make sure the bots each skill before moving onto the next one

**Outcome:** Updated Workday skills autofill logic to verify each skill is actually committed before proceeding by checking selected-item count/selection text, waiting for confirmation, and retrying with a fallback commit sequence when needed.

## 2026-03-23 - Force-click first Workday skill option

**Prompt:** this is the element for the skills field ... make sure the code can actually click the first option once a skill token is plugged in

**Outcome:** Added a Workday-specific first-option click routine targeting `activeListContainer` and the first `menuItem`/`promptOption` entry after each typed skill token, with retry/fallback sequencing to improve selection reliability.

## 2026-03-23 - Match Workday menuItem cell to skill token

**Prompt:** this is the html of the block with the wanted skill ... have the bot select the first cell matching this code(or similar) to it

**Outcome:** Refined Workday skills selection to prefer `menuItem` rows whose `id`, `aria-label`, or child `promptOption[data-automation-label]` matches the typed skill token (case-insensitive), then click that row; falls back to first visible option only when no match is found.

## 2026-03-23 - Harden Workday skill commit behavior

**Prompt:** the code is still not selecting the skills once the token is inputed, any ideas on how to fix this

**Outcome:** Fixed likely false-positive commit detection and strengthened selection actions: limited commit checks to selected-value regions/count changes, and updated Workday option clicks to include row + inner leaf/checkbox clicks plus Enter-key confirmation to better force actual skill selection.

## 2026-03-23 - Fresh PowerShell command sequence request

**Prompt:** what are the exact commands i need to run in a fresh powershell terminal

**Outcome:** Provided copy-paste PowerShell command sequences for a fresh environment to install dependencies, build the extension, start the Python server correctly with `.\start_server.bat`, and optional OpenAI environment variables for LLM parsing.

## 2026-03-23 - Workday Education control hardening

**Prompt:** this is the html for the education button found on the workday site ... lets make sure the code properly interacts with it similar to skills

**Outcome:** Added Workday-specific Education handlers in `src/modules/autofill/fieldFiller.js` for `Degree` (button/listbox selection with search + option click + commit verification) and `Field of Study` (multiselect token entry with prompt-option match/click and commit checks), reusing the hardened Workday prompt selection flow.

## 2026-03-23 - Add schools attended to debug matrix

**Prompt:** lets add to the debug the school that the user attented, I want to double check and make sure the parser is correctly picking it up

**Outcome:** Updated debug matrix row builders in `src/sidepanel/pages/debugPage.js` and `src/sidepanel/components/resumeUpload.js` to include `Schools Attended (all parsed)` (`education[].school`) as a deduplicated list from parsed education entries, in addition to `Latest School`.

## 2026-03-23 - Improve school extraction with university matching

**Prompt:** ok the parsing is not correctly identidying the school, is there a way to have to parsering check with a list of existing universitys, to properly identify the schools?

**Outcome:** Enhanced education parsing in `src/modules/resumeParser.js` with school-detection heuristics and a curated university matcher (known-university list + school keywords), then used those checks in `parseDegreeSchool` and `extractEducation` so school fields are less likely to be confused with degree/field-of-study text. Also updated `README.md` architecture notes to reflect this parsing behavior.

## 2026-03-23 - Strengthen LLM school detection across full resume

**Prompt:** this is what the debug is showing ... can we ask chatgpt to look throught the entire document for any know universitys or collages found on the resume?

**Outcome:** Updated `python-server/server.py` prompt instructions for `/parse-resume-llm` so ChatGPT explicitly scans the entire resume for university/college names and avoids treating fields of study as schools. Added school-candidate extraction + known-university hints passed into the prompt, and post-normalization that maps fuzzy school strings to known university names when applicable. Updated README ChatGPT section with this behavior.

## 2026-03-23 - Preserve prior schools in LLM merge

**Prompt:** ok it is picking up the latest school, but the debug does not have any previous schools

**Outcome:** Updated `src/modules/llmResumeParser.js` to merge education arrays from heuristic and LLM parses (LLM-first with dedupe) instead of replacing education with LLM-only output, so previously parsed schools remain visible in Debug. Updated README to document merged education behavior.
## 2026-04-09 - OpenAI API key parity with Firecrawl

**Prompt:** Implement the plan "OpenAI API key: current state and parity with Firecrawl" (python-server `.env.example`, `python-dotenv` + `load_dotenv` in `server.py`, root `.env.example` cross-link, README §4.1 and checklist).

**Outcome:** Added `python-server/.env.example` with `OPENAI_API_KEY` / optional `OPENAI_MODEL`; added `python-dotenv` to `requirements.txt` and `load_dotenv` for `python-server/.env`; extended root `.env.example` with an OpenAI section pointing at the Python server; updated README with Option A (`.env` file) vs Option B (shell env) and checklist step 3.

## 2026-04-10 - OPENAI_API_KEY not recognized (400 on `/parse-resume-llm`)

**Prompt:** I am still getting the 400 error, what needs to happen to get the API key recognized?

**Outcome:** Updated `python-server/server.py` to merge non-empty values from both the project root `.env` and `python-server/.env` (via `dotenv_values`), so keys stored only at the repo root are loaded; added startup log when the key is missing vs set; documented both paths in README and `.env.example` files.

## 2026-04-10 - API key still not set (empty OPENAI line)

**Prompt:** Is the api key set incorrectly? I have the openai api key in the .env but it still says the key is not set

**Outcome:** Verified on-disk `python-server/.env` had `OPENAI_API_KEY=` with no value after `=`; root `.env` had no assignment line for OpenAI (only comments). Added `_warn_if_openai_line_empty_in_env_files()` in `server.py` to log when the key name exists but the value is blank.

## 2026-04-12 - Session-scoped resume and job search storage

**Prompt:** Implement the plan "Session-scoped extension storage": move resume, targets, results, selected job, and autofill state to `chrome.storage.session` (clear between browser sessions); keep user profile and settings in `chrome.storage.local`; optional cleanup of stale local keys; README and fallback documentation.

**Outcome:** Refactored `src/modules/storage.js` to route ephemeral keys through `chrome.storage.session` with fallback to `local` when session is unavailable; added one-time migration flag `jobbot_clearedLocalEphemeral_v1` to remove legacy copies of ephemeral keys from `local`; updated `clear()` / `getAll()` to cover both areas; adjusted `targetPage.js` comment; expanded `README.md` on session vs persistent storage.

## 2026-04-13 - Compact side panel navigation (icons + More menu)

**Prompt:** Change the navigation bar so only Upload, Targets, Results, Detail, and Autofill appear on the top bar; put Settings and Debug in a "More options" menu; use icons with hover tooltips for section names to save space in the Chrome sidebar.

**Outcome:** Refactored `src/sidepanel/components/nav.js` to render inline SVG icon links with `title`/`aria-label` tooltips, a `<details>`/`<summary>` "More" control with Settings and Debug links, and active styling when on settings/debug. Added nav styles in `src/sidepanel/app.css` (layout, focus, dropdown panel). Documented in `README.md`.

## 2026-04-13 - Replace nav icons with Remix-style SVG assets

**Prompt:** Change the icons to `upload-line.svg`, `seo-line.svg`, `folder-line.svg`, `draft-line.svg`, and `pencil-ai-line.svg` for Upload, Targets, Results, Detail, and Autofill respectively.

**Outcome:** Added `src/sidepanel/icons/` with those five SVGs; `nav.js` imports them via `?raw`, normalizes size (`width`/`height` 20) and `aria-hidden`, and maps them to the five primary routes. The More menu ellipsis remains the existing stroke icon.

## 2026-04-14 - LLM skill extraction for ATS scoring and tailoring

**Prompt:** Implement the plan "LLM-based skill extraction for ATS scoring and tailoring": OpenAI via Flask `/extract-skills`, prompts in `python-server/prompts/skills_extraction.py`, shared overlap in `skillMatch.js`, async `scoreJob` + `targetPage` wiring, async tailor with heuristic fallback, README updates.

**Outcome:** Added `python-server/prompts/` with tunable skill prompts; implemented `POST /extract-skills` in `server.py`; added `llmSkillExtractor.js` and `skillMatch.js`; updated `scorer.js`, `tailor.js`, `targetPage.js`; documented §4.2 and project structure in `README.md`.

## 2026-04-15 - Extension API keys (storage-first, .env fallback)

**Prompt:** Implement the plan "Extension API key UI": persistent `chrome.storage.local` for Firecrawl and OpenAI keys; Settings page sub-tabs (More → Settings, Profile | API keys); resolve Firecrawl at runtime (storage then `VITE_FIRECRAWL_API_KEY`); forward OpenAI to Flask via `X-OpenAI-API-Key` with server fallback to `OPENAI_API_KEY`; README, `.env.example`, PROMPTS.

**Outcome:** Added `KEYS.FIRECRAWL_API_KEY` / `KEYS.OPENAI_API_KEY` and `src/lib/apiKeys.js`; updated `firecrawlAdapter.js`, `autofillController.js`, `llmResumeParser.js`, `llmSkillExtractor.js`; `_openai_api_key_from_request()` and CORS allow_headers in `server.py`; `settingsPage.js` sub-tabs and API key save/clear; documentation updates.

## 2026-04-15 - Billiards icon as extension + sidebar brand

**Prompt:** Use `billiards-fill.svg` as the extension logo/icon and show the icon top-left next to JobBot in the sidebar.

**Outcome:** Added `src/sidepanel/icons/billiards-fill.svg`; `scripts/generate-extension-icons.mjs` + `sharp` rasterizes it to `icons/icon16|48|128.png` (indigo fill for visible toolbar icons); `npm run build` / `predev` run the script; `nav.js` + `app.css` render the SVG beside the JobBot title; README build description updated.

## 2026-04-15 - API key validation in Settings

**Prompt:** Add validation for API keys with errors in the API key section if missing/invalid.

**Outcome:** Added `src/lib/apiKeyValidation.js` (Firecrawl scrape probe, OpenAI `GET /v1/models`, server `/health` now includes `openai_configured`); **API keys** tab shows a **Key checks** card with status lines; runs on tab open and after save/clear; `app.css` line styles for ok/warn/err.

## 2026-04-15 - Multiple work experience rows for Workday autofill

**Prompt:** Implement the plan "Multi-role Workday autofill": populate `workExperience[i].*` for every parsed resume role, remap DOM repeater ids to resume index, add enough Work Experience rows before scanning, README + PROMPTS.

**Outcome:** `fieldMapper.js` loops `resume.experience` in `buildLookup`, `normalizeWorkExperienceFieldKeys` + `wxResumeIndex` remap keys; `domFieldScanner` passes `inferenceSource`; `fieldFiller` counts Workday repeater ids and clicks Add to reach target; `autofillController` / `content.js` pass `workExperienceTargetCount` (cap 10); `FormField` typedef extended; README autofill bullet updated.

## 2026-04-16 - Parse resume from attached PDF in LLM call

**Prompt:** lets rewrite the prompt to have chatgpt read the pdf file we give it rather than the individual text

**Outcome:** Updated client/server LLM parsing flow so the uploaded PDF bytes are sent to `/parse-resume-llm` and forwarded to OpenAI Responses API as an attached file (`input_file`) with document-first parsing instructions; raw extracted text is now fallback context. Updated `src/modules/llmResumeParser.js`, `src/sidepanel/components/resumeUpload.js`, `python-server/server.py`, and README notes.

## 2026-04-28 - Resume reuse prompt and latest parsed metadata

**Prompt:** For the Resume tab and related functions. If there is no existing data, ask user to upload a compatible document, docx or pdf. Once the resume is parsed, aka information returned from Open AI API, save it locally like in Option 1. Then when the user returns the next time, use the most recent data indicating what file was uploaded and parsed. Ask if the user would like to proceed with the existing one or upload a new one.

**Outcome:** Updated `resumeUpload.js` to add a returning-user decision state: show "Saved resume found" with last parsed file name and parsed time, then offer **Use Existing** or **Upload New**. If no resume is stored, the Upload tab now explicitly asks for a compatible PDF/DOCX. After heuristic + optional LLM parse, resume data is persisted with `parsedAt` metadata and the user is returned to the decision view. Updated `storage.js` so parsed resumes persist in `chrome.storage.local` (not session-only), added a no-resume warning in `targetPage.js` and blocked search until a resume is uploaded/parsed, updated `resumeParser.js` typedef docs for `parsedAt`, and documented the behavior in `README.md`.

## 2026-04-28 - Autofill frame scan fix for visible Workday fields

**Prompt:** Autofill fails with "No fillable fields were found" even though visible fields are on the page (Workday screenshot provided).

**Outcome:** Updated `requestDomFieldScan()` in `src/modules/autofill/autofillController.js` to improve frame probing reliability: probe counts now include custom controls (`combobox`, listbox-trigger buttons, radio/radiogroup roles) and traverse open shadow roots, and frame attempts no longer skip frames whose basic-input probe count is zero. This ensures content-script extraction is attempted across all detected frames, including Workday pages where controls are custom/shadow-based.

## 2026-04-28 - Autofill direct executeScript extraction fallback

**Prompt:** Even after frame scan updates, autofill still errors with "No fillable fields were found."

**Outcome:** Added a stronger fallback path in `requestDomFieldScan()` (`src/modules/autofill/autofillController.js`): when content-script message extraction finds no fields, the controller now runs a direct `chrome.scripting.executeScript` extraction across all frames and uses the best frame result. Also added scan diagnostics (`debug`) to the no-fields error message so failures now show probe/extract path details for faster troubleshooting.

## 2026-04-28 - Fix missing content/content.js in dev watch

**Prompt:** New runtime error: "Could not load file: 'content/content.js'."

**Outcome:** Updated `package.json` `dev` script to watch/build both bundles in parallel: main extension build and the content-script IIFE build (`vite.content.config.js`). This ensures `dist/content/content.js` exists during development so programmatic injection via `chrome.scripting.executeScript({ files: ['content/content.js'] })` succeeds.

## 2026-04-28 - Required-field autofill retry with typing simulation

**Prompt:** Autofill values appear inserted but some ATS fields still error as required/empty; requested user-typing simulation if easier.

**Outcome:** Updated `src/modules/autofill/fieldFiller.js` to add a required-field commit retry path: after normal fill, required fields are validated for actual non-empty/selected state. If still missing, autofill retries with a keystroke-style typing simulation (`keydown`/`input`/`keyup` per character + `change`/`blur`) for text-like controls. Added helper checks for radio/checkbox/select/text emptiness to target retries only when needed.

## 2026-04-28 - Post-fill touched-state commit for validators

**Prompt:** Fields appear filled, but application only recognizes values after manually clicking into the field box.

**Outcome:** Added `commitFieldInteraction()` in `src/modules/autofill/fieldFiller.js` and invoked it after standard fill and typing-simulation fill paths. The helper now dispatches pointer/mouse focus interactions plus `input`/`change`/`focusout`/`blur` to better emulate user "touched" behavior that ATS validators depend on.

## 2026-04-28 - Workday From/To date commit fix

**Prompt:** Workday "From" and "To" date boxes show values but still fail required validation.

**Outcome:** Updated Workday date handlers in `src/modules/autofill/fieldFiller.js` so date inputs are filled via character-by-character typing and explicit commit events (`Enter`, `Tab`, `change`, `focusout`, `blur`, click-away). Converted date fill helpers to async and awaited them in `setFieldValue()` so autofill does not race ahead before date fields finish committing.

## 2026-04-28 - Stronger Workday date widget commit fallback

**Prompt:** Date widget still fails required validation after typing-based date fill.

**Outcome:** Strengthened Workday date commit behavior in `src/modules/autofill/fieldFiller.js`: added native `blur()`/real focus transitions to next control, post-commit invalid-state detection, and a calendar-button open/close fallback (`click` then `Escape`) to force widget-level commit when the field still appears invalid.

## 2026-04-28 - Workday date parts fallback (month/year controls)

**Prompt:** Date fields continue failing required validation despite visible values and commit-event fallbacks.

**Outcome:** Added `forceCommitViaNearbyDateParts()` in `src/modules/autofill/fieldFiller.js`. When a date field still appears invalid, autofill now parses `MM/YYYY` and fills nearby month/year sub-controls directly (inputs/selects/combobox/listbox buttons), then re-commits interaction on the visible date input. This targets Workday variants where validator state is tied to internal month/year controls rather than the displayed text field.

## 2026-04-28 - Calendar-icon commit + repeater growth guard

**Prompt:** Date still fails unless user clicks calendar icon; repeated autofill attempts add more fields each time.

**Outcome:** Updated `fieldFiller.js` so Workday date inputs now always run calendar-icon commit (`forceCommitViaDateButton`) after typing/blur, with follow-up refocus/change/blur. Also fixed repeater growth behavior by counting existing education repeater rows (`education<N>`) and only auto-clicking Education "Add" when no education row exists, preventing extra rows from being added on every autofill run.

## 2026-04-28 - Minimize Firecrawl usage and disable auto repeater expansion

**Prompt:** Autofill still fails and user requested reducing fields to minimize Firecrawl API token usage.

**Outcome:** Added `AUTO_EXPAND_WORKDAY_REPEATERS = false` (default) in `src/config/autofill.config.js` and gated repeater auto-add logic in `autofillController.js` so Workday does not keep growing field count on retries. Also updated `shouldSkipRemoteExtract()` in `firecrawlAdapter.js` to skip Firecrawl extraction for Workday hosts (`*.myworkdayjobs.com`, `*.workday.com`) so Workday autofill relies on DOM scan and avoids unnecessary Firecrawl token usage.

## 2026-04-28 - Fix intermittent missing content/content.js during watch

**Prompt:** Runtime error after latest changes: "Could not load file: 'content/content.js'."

**Outcome:** Fixed watch-build output race by setting `emptyOutDir: false` in `vite.config.js` so the main watcher does not wipe `dist` while the content watcher is running. Updated `package.json` `build` script to `rimraf dist` first, preserving clean production builds while keeping watch mode stable.

## 2026-04-28 - Workday custom dropdown key matching fallback

**Prompt:** The dropdown selection in Workday is not working for our custom field key value pairs. The autofill function seems to click into the dropdown fields but does not select an option or save the information that it fills out.

**Outcome:** Updated `src/modules/autofill/fieldMapper.js` to add a custom-answer fallback matcher that resolves `commonAnswers.<customKey>` values by normalized label/inference text (including partial key support like `are you subjec` for long Workday questions). This improves mapping of custom profile key-value pairs into dropdown/radio questions even when heuristic key inference does not return an exact key. Updated `README.md` custom keys documentation accordingly.

## 2026-04-28 - Workday dropdown commit and mirror-input guard

**Prompt:** The autofill is still missing the dropdowns and not saving the actual answers to the questions. It briefly selects an answer and moves on without confirming.

**Outcome:** Strengthened dropdown reliability in two places: (1) `src/modules/autofill/fieldMapper.js` now skips likely mirrored text inputs when a same-label select/radio control exists (prevents Workday mirror inputs from clearing committed choices), and (2) `src/modules/autofill/fieldFiller.js` now verifies combobox selections are visibly committed, applies a stronger commit sequence (Enter/Tab/change/blur/click-away), and retries instead of immediately advancing when selection does not stick. Updated `README.md` autofill pipeline notes.

## 2026-04-28 - Zero-fields fallback hardening for Workday

**Prompt:** The autofill now detects zero fields when trying to fill the page again.

**Outcome:** Hardened `requestDomFieldScan()` fallback in `src/modules/autofill/autofillController.js`: direct executeScript extraction now scans open shadow roots (not only `document.querySelectorAll`), improves selector/label escaping for reliability, and returns richer fallback discovery data. This prevents false zero-field results on Workday pages with shadow-DOM-based controls when content-script message extraction is unavailable.

## 2026-04-28 - Broader DOM scan selectors + probe frame fallback

**Prompt:** The autofill is still detecting zero fields when scanning the page.

**Outcome:** Added `src/config/domScanSelectors.js` with shared primary + wide CSS patterns (Workday `aria-haspopup` variants, `data-automation-id`, listbox/dialog/menu triggers). Wired `domFieldScanner.js` and `requestDomFieldScan()` probe/inline paths to this list; when every frame’s probe count is zero, content-script extraction still iterates all frames returned by `executeScript`, not only ranked matches. Treated dialog/menu popup triggers as combobox/select in `domFieldScanner.js`, `fieldFiller.js`, and inline typing. Fixed inline injection block referencing `role` before definition.

## 2026-04-28 - Deep-scan heuristic when Workday CSS misses controls

**Prompt:** Autofill shows 0 fields on Workday application questions despite visible dropdowns (`0 of 0 fields filled`). Previously dropdowns were at least detected.

**Outcome:** Added `src/modules/autofill/domFillableHeuristic.js` with `elementLooksFillableHeuristic` + `collectDeepFallbackCandidates()` (shadow walk). `domFieldScanner.js` merges this when CSS queries return zero in a frame. Probe + inline executeScript duplicates the same heuristic so frame ranking and `allFrames` injection still find prompts when selectors miss hydrated/disabled quirks. Relaxed `DOM_SCAN_CONTROL_SELECTOR_PRIMARY` inputs (drop `:disabled` exclusion on inputs). Expanded `data-automation-id` pattern hints and combobox hints in `domFieldScanner` / `fieldFiller`.

## 2026-04-28 - Scan retry timing + broader selector admission

**Prompt:** The same issue occurred. The autofill is still getting zero fields detected.

**Outcome:** Broadened selector admission in `src/config/domScanSelectors.js` by removing disabled/aria-disabled filters from primary and wide scan selectors (so transiently disabled Workday controls are still discovered). Added retry logic in `requestDomFieldScan(tabId, attempt)` (`src/modules/autofill/autofillController.js`) with short backoff before returning no-fields, so hydration delays no longer prematurely yield `0 fields`.

## 2026-04-28 - Workday legend-based question label extraction

**Prompt:** Provided Workday page HTML and requested dropdown-by-dropdown behavior (open menu, select option, move next). Noted fields still appeared as zero detected.

**Outcome:** Updated label extraction to use Workday question sources (`fieldset > legend`, rich-label/richText containers) in both `domFieldScanner.js` and inline fallback extraction inside `autofillController.js`. This avoids using generic button aria-labels like `Select One Required`, allowing mapped values to target each question dropdown and proceed sequentially.
## 2026-04-28 - Resume storage messaging + clear profile action

**Prompt:** Tell user resume is saved in local storage on first upload, show "Saved resume found" when existing data exists, and add a clear profile option next to Save Profile with confirmation warning about re-inputting custom fields.

**Outcome:** Updated Upload page copy in `src/sidepanel/pages/uploadPage.js` to explicitly describe first-time local-storage save behavior and returning-user "Saved resume found" behavior. Updated Settings Profile actions in `src/sidepanel/pages/settingsPage.js` to add **Clear profile data** next to **Save profile**, show a confirmation dialog, clear `jobbot_userProfile` from storage on confirm, reset profile form fields, and show status text reminding users they must re-input custom fields.

## 2026-04-28 - Separate profile clear vs API key clear warnings

**Prompt:** Keep key clearing separate; warn users that clearing profile only clears Profile page data and retains API keys. Keep separate clear-key actions with similar warning.

**Outcome:** Updated `settingsPage.js` copy and confirmations: added inline Profile-tab note that API keys are retained when clearing profile; changed profile-clear confirm/status messages to explicitly say API keys are not cleared; added confirmation prompts on Firecrawl/OpenAI key clear buttons stating key-clearing is separate and does not affect profile data.

## 2026-04-28 - Clear profile now also clears resume data

**Prompt:** "Clear profile data" should also clear resume data, and the message should indicate that.

**Outcome:** Updated `settingsPage.js` so the profile-clear action now removes both `KEYS.USER_PROFILE` and `KEYS.RESUME`. Updated inline warning text, confirmation dialog, and post-clear status message to explicitly say profile + saved resume data are cleared, while API keys remain separate.

## 2026-04-28 - Initial upload confirmation vs next-load saved state

**Prompt:** On first/initial upload, notify user that the resume is saved; only on next extension load should it show "Saved resume found".

**Outcome:** Updated `resumeUpload.js` so immediate post-upload UI now shows a "Resume uploaded and saved locally." confirmation in preview mode, without routing to the "Saved resume found" choice state. The "Saved resume found" screen remains the initial state only when stored resume data is detected on a subsequent extension load.

## 2026-04-28 - Debug matrix access from saved-resume choice screen

**Prompt:** Even when saved data is found, ensure "Show Debug Matrix" is available so users can view it.

**Outcome:** Updated `resumeUpload.js` to add a **Show Debug Matrix** button directly on the "Saved resume found" screen. It opens the stored preview with debug matrix expanded by default; toggle button/initial visibility now respects a `startDebugOpen` option.

## 2026-04-28 - Background job search survives tab switches

**Prompt:** Job search halts when switching browser tabs; requested search to continue since it is not page-dependent like autofill.

**Outcome:** Moved search execution to `src/background/service-worker.js` via new runtime messages (`JOB_SEARCH_START`, `JOB_SEARCH_STATUS`). Added persisted search state in `storage.js` (`KEYS.JOB_SEARCH_STATE`, `getJobSearchState`, `setJobSearchState`). Updated `targetPage.js` to start background search, poll status, show progress, and navigate to Results on completion. This keeps search/scoring running across tab switches and sidepanel context changes.

## 2026-04-28 - Prevent Targets page bounce after completed search

**Prompt:** After auto-navigating to Results on completion (intended), returning to Job Search immediately redirects back to Results and blocks starting a new search.

**Outcome:** Updated `targetPage.js` so when a completed search state is consumed for auto-navigation, it immediately resets `jobSearchState` to `idle`. This preserves auto-navigation behavior once, but allows users to return to Targets and run new searches without being bounced back.

## 2026-04-30 - Workday autofill skips Experience/Education Add buttons

**Prompt:** Autofill does not press Workday `Add` for Work Experience and Education; only detects skills lower on the page.

**Outcome:** Instrumented `autofillController.js` with debug-session NDJSON logs (hypotheses H1–H5). Logs confirmed `AUTO_EXPAND_WORKDAY_REPEATERS: false` blocked expansion while resume had rows (`shouldPrepareWorkdayRepeaters: true`) and first scan showed `skillsFieldHints: 1` but zero repeater hints. Fix: `shouldExpandWorkdayRepeaters(pageUrl)` enables repeater expansion on `*.myworkdayjobs.com` automatically; config flag still forces expansion on other hosts.

## 2026-04-30 - Workday issue reproduced / proceed with fix

**Prompt:** Issue reproduced, please proceed.

**Outcome:** Read `.cursor/debug-a7ea79.log`, evaluated hypotheses from NDJSON lines; implemented URL-based repeater expansion and updated README/autofill config comments; cleared log file for verification; instrumentation kept (`runId: verify-fix`).

## 2026-04-30 - Workday date fields need extra manual interaction

**Prompt:** Experience/Education dates fill but Workday requires another manual interaction on the date fields.

**Outcome:** Added `JOBBOT_DEBUG_LOG` relay in `service-worker.js` and capped instrumentation in `fieldFiller.js` (`typeAndCommitWorkdayDateInput`, Workday month/year combobox path in `setComboboxValue`) to capture aria-invalid / displayed value / commit guesses; cleared `.cursor/debug-a7ea79.log` for the next capture run.

## 2026-04-30 - Workday submit rejects filled From/To dates

**Prompt:** Errors Found lists From/To required although dates look filled until user clicks each box.

**Outcome:** Logs (`wd-date-commit`) showed DOM values present (`dbgAfter.value`) while Workday blocked Save — consistent with React controlled inputs. Implemented `applyNativeInputValueReactAware` (`_valueTracker` sync + native value setter + bulk `input`) replacing per-keystroke mutation in `typeAndCommitWorkdayDateInput`; extended debug payload with `hadReactTracker`; README note; instrumentation retained for verification.

## 2026-04-30 - Workday dates reproduced / evidence on React tracker

**Prompt:** Issue reproduced, please proceed.

**Outcome:** Read `.cursor/debug-a7ea79.log`: all sampled date lines showed `hadReactTracker:false`, so Workday inputs here are not using React’s `_valueTracker` path. Reworked `typeAndCommitWorkdayDateInput` to pointer-activate the input, run `commitFieldInteraction`, always attempt `forceCommitViaDateButton` when a calendar trigger exists (**Enter** then **Escape** on the focused node), dropped body click-away and removed unused `focusNextFocusable`; log field `usedCalendarFallback` reflects whether a calendar button was found. Cleared debug log for verification.

## 2026-04-30 - Workday dates reproduced / calendar never found

**Prompt:** Issue reproduced, please proceed.

**Outcome:** Logs showed `usedCalendarFallback:false` on every date fragment — `forceCommitViaDateButton` never resolved a calendar node (`closest` + shallow `querySelector` missed triggers in/near shadow DOM). Implemented `querySelectorIncludingShadowRoots`, `nextAncestorElement`, and `findWorkdayCalendarTriggerNearDateInput`; rewired `forceCommitViaDateButton` to use it. README updated; cleared `.cursor/debug-a7ea79.log` for verification.

## 2026-04-30 - Workday dates / calendar still unmatched

**Prompt:** Issue reproduced, please proceed.

**Outcome:** Post–shadow-walk logs still had `usedCalendarFallback:false` on all fields. Broadened calendar selectors (incl. `IconButton`, `role="button"`, date-picker label), search each hop on both `scope` and `scope.parentElement` for sibling icons, added `beforeinput` on bulk value set, and **`typeWorkdayDateCharsWithBeforeinput`** when no calendar triggers. Log field `usedCharFallback`. Cleared `.cursor/debug-a7ea79.log`.

## 2026-04-30 - Remove Workday debug instrumentation

**Prompt:** The issue has been fixed. Please clean up the instrumentation.

**Outcome:** Removed NDJSON/fetch hooks from `autofillController.js`, `JOBBOT_DEBUG_LOG` relay and ingest URL from `service-worker.js`, and `jbAgentDbg` / `#region agent log` blocks from `fieldFiller.js` (`typeAndCommitWorkdayDateInput`, `setComboboxValue`). Kept functional Workday date logic (pointer activation, `beforeinput`, calendar discovery, char fallback). Rebuilt with `npm run build`.
