# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Terminal/Command Prompt

## Step 1: Setup Backend (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with minimal config
echo "SECRET_KEY=my-secret-key-for-development" > .env
echo "AI_PROVIDER=huggingface" >> .env
echo "DATABASE_URL=sqlite:///./app.db" >> .env

# Start backend
python run.py
```

Backend is now running at http://localhost:8000!
Check API docs at http://localhost:8000/docs

## Step 2: Setup Frontend (2 minutes)

Open a NEW terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend is now running at http://localhost:5173!

## Step 3: Use the Application (1 minute)

1. Open browser to http://localhost:5173
2. Click "Sign up" and create an account
3. Upload a resume (PDF or DOCX)
4. Click "Parse Resume" to extract data
5. Go to "Jobs" and import a job listing
6. Click "Calculate Match" to see how well you match!

## Default Configuration

The app comes with sensible defaults:

- **Database**: SQLite (no setup needed)
- **AI Provider**: HuggingFace (free, no API key needed)
- **Storage**: Local filesystem

## Next Steps

- Add your AI provider API keys in `backend/.env` for better results
- Explore the API documentation at http://localhost:8000/docs
- Check out the full README.md for detailed configuration options

## Troubleshooting

**Backend won't start:**
- Make sure virtual environment is activated
- Check if port 8000 is available
- Verify Python version: `python --version` (should be 3.11+)

**Frontend won't start:**
- Check if port 5173 is available
- Verify Node version: `node --version` (should be 18+)
- Try deleting node_modules and running `npm install` again

**Can't parse resumes:**
- HuggingFace may be slow on first request (model loading)
- Check internet connection
- Try with a different AI provider

## Support

- Full documentation: See README.md
- API documentation: http://localhost:8000/docs
- Report issues: Create a GitHub issue

