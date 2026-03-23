@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Installing dependencies...
.venv\Scripts\pip install -q -r requirements.txt

echo Starting scraper server on port 5001...
.venv\Scripts\python server.py
