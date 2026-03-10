@echo off
echo Starting Job Search Tool Backend...
echo.

cd backend

REM Check if venv exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting FastAPI server...
echo API will be available at: http://localhost:8000
echo API docs available at: http://localhost:8000/docs
echo.

python main.py

