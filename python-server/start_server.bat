@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Installing dependencies...
.venv\Scripts\pip install -q -r requirements.txt

REM python-jobspy depends on numpy==1.26.3, which is problematic on newer Python
REM and can be blocked by Windows Application Control policies.
REM Install jobspy without dependencies, then install compatible dependency versions.
.venv\Scripts\pip install -q --upgrade pip
.venv\Scripts\pip install -q --no-deps "python-jobspy>=1.1.0"
.venv\Scripts\pip install -q --upgrade "numpy>=2.0" "pandas>=2.2" tls-client regex markdownify "pydantic>=2.0"

echo Starting scraper server on port 5001...
.venv\Scripts\python server.py
