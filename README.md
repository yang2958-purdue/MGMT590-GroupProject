# JobBot

JobBot is a self-contained Electron desktop application for job search automation and resume tailoring. It runs locally with no external hosting or database: a Next.js frontend and a FastAPI Python backend (spawned by Electron).

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **npm** (or yarn)

## Setup

1. **Install Node dependencies**

   ```bash
   npm install
   ```

2. **Set up the Python backend (one-time)**

   The backend uses a virtual environment at `backend/.venv`. Create it and install dependencies:

   **Windows (PowerShell or cmd):**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   cd ..
   ```

   **Mac/Linux:**
   ```bash
   cd backend
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   cd ..
   ```

   After this, `npm run python:dev` uses the venv automatically (no need to activate it).

3. **Run the app (development)**

   - Start the Next.js dev server and Electron together:

     ```bash
     npm run dev
     ```

   - Or run them in separate terminals (keep Terminal 1 and 2 running):
     - **Terminal 1:** `npx next dev` — start the frontend (Electron loads from http://localhost:3000).
     - **Terminal 2:** `npm run python:dev` — start the backend (optional if using `npm run dev`; Electron also starts the backend).
     - **Terminal 3:** `npm run build:electron && npm run electron:dev` — build and launch Electron. Run this only after Next.js is up, or you’ll see `ERR_CONNECTION_REFUSED` on load.

4. **Backend only (for API testing)**

   ```bash
   npm run python:dev
   ```

   Then call `http://localhost:7823/health` and other endpoints (e.g. POST `/api/resume/parse` with a file).

## Build (packaging)

1. Export the Next.js static site and build Electron:

   ```bash
   npm run build
   ```

2. Output is in the `dist/` directory (installers or unpacked app depending on `electron-builder` config).

**Running the installed app:** The installer does not bundle Python. You must have **Python 3.10+** installed on the machine where you run JobBot. Install it from [python.org](https://www.python.org/downloads/) and ensure **"Add Python to PATH"** is checked. The app will look for Python in standard install locations (e.g. `%LOCALAPPDATA%\\Programs\\Python`) or on your PATH. If Python is missing, JobBot will show an error dialog with these instructions.

## Project structure

- `electron/` – Electron main process, preload script, Python bridge
- `src/` – Next.js App Router frontend (static export)
- `backend/` – FastAPI app: resume parsing, job scraping, scoring, tailoring

## Configuration

API keys (e.g. Anthropic for resume tailoring) are stored in a config file. In development the backend uses `backend/config.json` if `JOBBOT_CONFIG_PATH` is not set; when run from Electron, the path is set to the app user data directory. Use **Settings** in the app sidebar to add an Anthropic API key for the tailor feature.
