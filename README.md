# AI-Powered Job Search Automation Platform

An intelligent job search platform that uses AI to parse resumes, match candidates with jobs, generate tailored resumes, and create personalized cover letters.

## Features

### Phase 1 MVP (Implemented)

- **User Authentication**: Secure JWT-based authentication system
- **Resume Management**: Upload, parse, and store resumes (PDF/DOCX supported)
- **AI-Powered Resume Parsing**: Extract structured data from resumes using AI
- **Job Listing Management**: Manually import and manage job listings
- **Intelligent Job Matching**: Calculate match scores between resumes and jobs
- **Resume Tailoring**: Generate customized resumes for specific job applications
- **Cover Letter Generation**: Create personalized cover letters using AI
- **Application Tracking**: Track application status, notes, and documents
- **Multi-Provider AI Support**: Use HuggingFace (free), OpenAI, Anthropic, or local models

## Architecture

The application follows a modern, modular architecture:

```
Frontend (React + TypeScript + Vite)
    ↓ REST API
Backend (FastAPI + Python)
    ↓ Service Layer
AI Provider Abstraction Layer
    ↓ Provider Interface
Database (SQLite/PostgreSQL)
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT with bcrypt
- **File Processing**: PyPDF2, python-docx
- **AI Providers**: HuggingFace, OpenAI, Anthropic, Ollama

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: Custom CSS with modern design system

## Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MGMT590-GroupProject
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux

# Edit .env file and set your configuration
# Minimum required: SECRET_KEY
# For AI features: Set AI_PROVIDER and corresponding API keys
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000" > .env
```

## Configuration

### Backend Configuration (.env)

```env
# Required
SECRET_KEY=your-secret-key-here  # Generate a secure random string

# Database (default: SQLite)
DATABASE_URL=sqlite:///./app.db
# For PostgreSQL: postgresql://user:password@localhost:5432/dbname

# AI Provider (default: huggingface)
AI_PROVIDER=huggingface  # Options: huggingface, openai, anthropic, local

# Optional: AI Provider API Keys
HUGGINGFACE_API_KEY=  # Optional for free inference
OPENAI_API_KEY=       # Required if using OpenAI
ANTHROPIC_API_KEY=    # Required if using Anthropic
OLLAMA_BASE_URL=http://localhost:11434  # For local models

# Other settings
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Choosing an AI Provider

1. **HuggingFace (Free)** - Default, works without API key
   - Best for: Getting started, testing
   - Set: `AI_PROVIDER=huggingface`

2. **OpenAI (Paid)** - Best quality results
   - Best for: Production, high-quality output
   - Set: `AI_PROVIDER=openai` and `OPENAI_API_KEY=your-key`

3. **Anthropic Claude (Paid)** - Excellent quality
   - Best for: Production, detailed analysis
   - Set: `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=your-key`

4. **Local/Ollama (Free)** - Run locally
   - Best for: Privacy, offline use
   - Requires: Ollama installed locally
   - Set: `AI_PROVIDER=local`

## Running the Application

### Start Backend Server

```bash
cd backend

# Activate virtual environment if not active
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run the server
python -m app.main

# Or using uvicorn directly:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

### Start Frontend Development Server

```bash
cd frontend

# Run the development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## Usage Guide

### 1. Register/Login
- Navigate to http://localhost:5173
- Create a new account or login

### 2. Upload Resume
- Go to "Resumes" page
- Click "Upload Resume"
- Select a PDF or DOCX file
- Click "Parse Resume" to extract data

### 3. Import Jobs
- Go to "Jobs" page
- Click "Import Job"
- Fill in job details (title, company, description)
- Submit the form

### 4. Match Resume to Job
- Select a job from the list
- Click "Calculate Match"
- View match score and skills analysis

### 5. Apply to Jobs
- Click "Apply" on a job
- Application will be created and tracked

### 6. Track Applications
- Go to "Applications" page
- View all applications
- Update status, add notes
- Track progress

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Resumes
- `POST /api/resumes/upload` - Upload resume
- `GET /api/resumes/` - List resumes
- `GET /api/resumes/{id}` - Get resume
- `POST /api/resumes/{id}/parse` - Parse resume
- `DELETE /api/resumes/{id}` - Delete resume

### Jobs
- `POST /api/jobs/import` - Import job listing
- `GET /api/jobs/` - List jobs
- `GET /api/jobs/{id}` - Get job details

### Applications
- `POST /api/applications/` - Create application
- `GET /api/applications/` - List applications
- `GET /api/applications/{id}` - Get application
- `PATCH /api/applications/{id}` - Update application
- `DELETE /api/applications/{id}` - Delete application

### Matching
- `POST /api/matching/match` - Calculate match score
- `POST /api/matching/tailor-resume` - Generate tailored resume
- `POST /api/matching/generate-cover-letter` - Generate cover letter

## Project Structure

```
MGMT590-GroupProject/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── ai/           # AI provider abstraction
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utilities
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # Database setup
│   │   └── main.py       # FastAPI app
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   ├── store/        # State management
│   │   ├── types/        # TypeScript types
│   │   ├── App.tsx       # Main app
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── vite.config.ts
├── README.md
└── PROMPTS.md
```

## Development

### Backend Development

```bash
# Run tests (when implemented)
pytest

# Format code
black app/

# Type checking
mypy app/
```

### Frontend Development

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Building for Production

### Backend

```bash
cd backend

# Set production environment variables in .env
DEBUG=False
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Run with production server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend

```bash
cd frontend

# Build
npm run build

# Output in dist/ directory
# Deploy dist/ to your hosting service
```

## Troubleshooting

### Backend Issues

**Database connection errors:**
- Check DATABASE_URL in .env
- Ensure database file permissions (SQLite)
- Verify PostgreSQL is running (if using PostgreSQL)

**AI provider errors:**
- Verify API keys are set correctly
- Check internet connection (for cloud providers)
- Try switching to different provider

**File upload errors:**
- Check uploads/ directory permissions
- Verify MAX_FILE_SIZE setting
- Ensure file format is supported (PDF, DOCX)

### Frontend Issues

**API connection errors:**
- Verify backend is running on port 8000
- Check CORS settings in backend
- Confirm VITE_API_URL in frontend .env

**Authentication issues:**
- Clear localStorage
- Check JWT token expiration
- Verify SECRET_KEY hasn't changed

## Future Enhancements (Phase 2 & 3)

- Automated job scraping from job boards
- Automated application form filling
- Email notifications
- Interview preparation assistance
- Analytics dashboard
- Networking suggestions
- Multi-resume support
- Team collaboration features

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Create an issue in the repository
- Check documentation at /docs
- Review API documentation at http://localhost:8000/docs

## Acknowledgments

- FastAPI for the excellent Python web framework
- React team for the frontend framework
- AI providers: HuggingFace, OpenAI, Anthropic
- All open-source contributors

