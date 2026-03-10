@echo off
echo Starting Job Search Tool Frontend...
echo.

cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Dependencies not found. Installing...
    call npm install
    echo.
)

echo Starting development server...
echo App will be available at: http://localhost:3000
echo.

call npm run dev

