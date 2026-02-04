---
name: AI Job Search Platform MVP
overview: Build a full-stack AI-powered job search automation platform with FastAPI backend and React frontend. The system will support resume parsing, job matching, resume tailoring, cover letter generation, and application tracking. Architecture will be modular with AI provider abstraction to support multiple LLM providers (free and paid).
todos:
  - id: setup-backend
    content: Set up FastAPI backend project structure, dependencies, database models, and configuration
    status: pending
  - id: setup-auth
    content: Implement JWT-based authentication system (registration, login, protected routes)
    status: pending
    dependencies:
      - setup-backend
  - id: ai-provider-abstraction
    content: Create AI provider abstraction layer with interface and factory pattern
    status: pending
    dependencies:
      - setup-backend
  - id: ai-provider-implementations
    content: Implement AI providers (HuggingFace, local/Ollama, OpenAI, Anthropic)
    status: pending
    dependencies:
      - ai-provider-abstraction
  - id: resume-upload-storage
    content: Implement resume file upload endpoint with validation and secure storage
    status: pending
    dependencies:
      - setup-auth
  - id: resume-parser-service
    content: Build resume parsing service using AI provider to extract structured data
    status: pending
    dependencies:
      - ai-provider-implementations
      - resume-upload-storage
  - id: job-matching-service
    content: Implement job matching algorithm with scoring (keyword + semantic matching)
    status: pending
    dependencies:
      - ai-provider-implementations
      - resume-parser-service
  - id: resume-tailoring-service
    content: Build resume tailoring service to customize resumes for specific jobs
    status: pending
    dependencies:
      - ai-provider-implementations
      - resume-parser-service
  - id: cover-letter-service
    content: Implement cover letter generation service using AI provider
    status: pending
    dependencies:
      - ai-provider-implementations
      - resume-parser-service
  - id: api-endpoints
    content: Create all REST API endpoints (resumes, jobs, applications, matching)
    status: pending
    dependencies:
      - resume-parser-service
      - job-matching-service
      - resume-tailoring-service
      - cover-letter-service
  - id: setup-frontend
    content: Set up React + TypeScript + Vite frontend project with routing and API client
    status: pending
  - id: frontend-auth
    content: Build authentication UI (login, register) and protected route wrapper
    status: pending
    dependencies:
      - setup-frontend
      - setup-auth
  - id: frontend-dashboard
    content: Create user dashboard with statistics and quick actions
    status: pending
    dependencies:
      - frontend-auth
  - id: frontend-resume-management
    content: Build resume upload, list, and detail views with parsed data display
    status: pending
    dependencies:
      - frontend-dashboard
      - resume-upload-storage
  - id: frontend-job-search
    content: Create job search form, job list, and job detail views with match scoring
    status: pending
    dependencies:
      - frontend-dashboard
      - job-matching-service
  - id: frontend-application-tracker
    content: Build application tracker UI with status management, notes, and document viewing
    status: pending
    dependencies:
      - frontend-dashboard
      - api-endpoints
  - id: testing-documentation
    content: Write unit tests, API tests, and update README with setup instructions
    status: pending
    dependencies:
      - api-endpoints
      - frontend-application-tracker
---

# AI-Powered Job Search Automation Platform - Implementation Plan

## Architecture Overview

The application follows a modular, three-tier architecture:

```
Frontend (React + TypeScript)
    ↓ HTTP/REST API
Backend (FastAPI + Python)
    ↓ Service Layer
AI Service Abstraction Layer
    ↓ Provider Interface
Database (PostgreSQL/SQLite)
```

### Technology Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL (with SQLite fallback for development)
- **AI Provider**: Abstraction layer supporting multiple providers (Hugging Face, OpenAI, Anthropic, local models)
- **File Processing**: PyPDF2, python-docx for resume parsing
- **Authentication**: JWT-based auth
- **State Management**: React Context API or Zustand

## Project Structure

````
MGMT590-GroupProject/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application entry
│   │   ├── config.py               # Configuration management
│   │   ├── database.py             # Database connection & models
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── auth.py         # Authentication endpoints
│   │   │   │   ├── users.py        # User management
│   │   │   │   ├── resumes.py      # Resume upload & management
│   │   │   │   ├── jobs.py         # Job listing management
│   │   │   │   ├── applications.py # Application tracking
│   │   │   │   └── matching.py     # Job matching endpoints
│   │   │   └── dependencies.py     # Shared dependencies (auth, etc.)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── resume_parser.py    # Resume extraction service
│   │   │   ├── job_matcher.py      # Matching algorithm
│   │   │   ├── resume_tailor.py    # Resume customization
│   │   │   ├── cover_letter_gen.py  # Cover letter generation
│   │   │   └── file_storage.py     # File upload/storage
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── provider.py         # AI provider abstraction interface
│   │   │   ├── providers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── huggingface.py  # Hugging Face implementation
│   │   │   │   ├── openai.py       # OpenAI implementation
│   │   │   │   ├── anthropic.py    # Anthropic implementation
│   │   │   │   └── local.py        # Local model (Ollama) implementation
│   │   │   └── factory.py          # Provider factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py             # User SQLAlchemy model
│   │   │   ├── resume.py           # Resume model
│   │   │   ├── job_listing.py      # Job listing model
│   │   │   ├── application.py      # Application tracking model
│   │   │   └── schemas.py          # Pydantic schemas
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py         # Password hashing, JWT
│   │       └── logging.py           # Logging configuration
│   ├── tests/
│   │   ├── test_resume_parser.py
│   │   ├── test_job_matcher.py
│   │   └── test_api.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── StatsCard.tsx
│   │   │   ├── Resume/
│   │   │   │   ├── ResumeUpload.tsx
│   │   │   │   ├── ResumeView.tsx
│   │   │   │   └── ResumeList.tsx
│   │   │   ├── Jobs/
│   │   │   │   ├── JobSearchForm.tsx
│   │   │   │   ├── JobList.tsx
│   │   │   │   ├── JobCard.tsx
│   │   │   │   └── JobDetails.tsx
│   │   │   ├── Applications/
│   │   │   │   ├── ApplicationTracker.tsx
│   │   │   │   ├── ApplicationCard.tsx
│   │   │   │   └── ApplicationForm.tsx
│   │   │   ├── Matching/
│   │   │   │   ├── MatchScore.tsx
│   │   │   │   └── MatchDetails.tsx
│   │   │   └── common/
│   │   │       ├── Layout.tsx
│   │   │       ├── Navbar.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ResumeManagement.tsx
│   │   │   ├── JobSearch.tsx
│   │   │   └── Applications.tsx
│   │   ├── services/
│   │   │   ├── api.ts              # API client
│   │   │   └── auth.ts             # Auth service
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useApi.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── README.md
├── PROMPTS.md
├── .gitignore
└── docker-compose.yml              # Optional: for local development

## Phase 1 MVP Implementation

### 1. Backend Foundation

#### 1.1 Project Setup
- Initialize FastAPI project with proper structure
- Set up virtual environment and dependencies
- Configure environment variables (.env.example)
- Set up database connection (SQLAlchemy)
- Configure CORS for frontend communication
- Set up logging and error handling

#### 1.2 Database Models
Create SQLAlchemy models for:
- **User**: id, email, hashed_password, created_at, preferences (JSON)
- **Resume**: id, user_id, filename, file_path, parsed_data (JSON), created_at
- **JobListing**: id, title, company, description, location, salary_range, work_type, url, source, posted_date
- **Application**: id, user_id, job_listing_id, status, applied_date, notes, tailored_resume_path, cover_letter_path

#### 1.3 Authentication System
- JWT-based authentication
- User registration and login endpoints
- Password hashing (bcrypt)
- Protected route decorators
- Token refresh mechanism

#### 1.4 Resume Upload & Storage
- File upload endpoint (PDF/DOCX)
- Secure file storage (local filesystem or S3-compatible)
- File validation (size, type)
- Resume model creation

### 2. AI Service Layer

#### 2.1 AI Provider Abstraction
Create abstract base class `AIProvider` with methods:
- `parse_resume(file_path: str) -> Dict` - Extract structured data
- `parse_job_description(text: str) -> Dict` - Extract job requirements
- `match_resume_to_job(resume_data: Dict, job_data: Dict) -> float` - Calculate match score
- `tailor_resume(resume_data: Dict, job_data: Dict) -> str` - Generate tailored resume
- `generate_cover_letter(resume_data: Dict, job_data: Dict, company_info: Dict) -> str` - Generate cover letter

#### 2.2 Provider Implementations
- **HuggingFace Provider**: Use free models (e.g., `microsoft/DialoGPT-medium` for text, or specialized models)
- **Local Provider**: Support Ollama for local inference
- **OpenAI Provider**: Ready for when API key is provided
- **Anthropic Provider**: Ready for when API key is provided

#### 2.3 Provider Factory
- Environment-based provider selection
- Fallback mechanism if primary provider fails

### 3. Resume Processing Service

#### 3.1 Resume Parser Service
- Extract text from PDF/DOCX
- Use AI provider to structure data:
  - Skills (list)
  - Work experience (list of {company, role, duration, description})
  - Education (list of {institution, degree, year})
  - Certifications
  - Projects
- Store parsed data as JSON in database
- Handle parsing errors gracefully

### 4. Job Matching Service

#### 4.1 Job Matcher Service
- Parse job descriptions using AI
- Extract requirements:
  - Required skills
  - Preferred skills
  - Experience level
  - Education requirements
- Calculate match score:
  - Keyword matching (skills, technologies)
  - Semantic similarity (using AI embeddings)
  - Experience alignment
  - Education alignment
- Return ranked list with scores (0-100)

### 5. Resume Tailoring Service

#### 5.1 Resume Tailor Service
- Accept resume data and job description
- Use AI to:
  - Reorder sections by relevance
  - Highlight matching skills/experience
  - Optimize keyword density
  - Maintain factual accuracy (no fabrication)
- Generate tailored resume as formatted text/PDF
- Store tailored version for application

### 6. Cover Letter Generation Service

#### 6.1 Cover Letter Generator
- Use AI to generate personalized cover letter:
  - Address specific job requirements
  - Highlight relevant experience
  - Include company research (if available)
  - Professional tone
- Store generated cover letter

### 7. API Endpoints

#### 7.1 Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /refresh` - Refresh token
- `GET /me` - Get current user

#### 7.2 Resume Routes (`/api/resumes`)
- `POST /upload` - Upload resume file
- `GET /` - List user's resumes
- `GET /{resume_id}` - Get resume details
- `DELETE /{resume_id}` - Delete resume
- `POST /{resume_id}/parse` - Trigger parsing

#### 7.3 Job Routes (`/api/jobs`)
- `POST /import` - Manually import job listing (Phase 1)
- `GET /` - List jobs (with filters)
- `GET /{job_id}` - Get job details
- `POST /{job_id}/match` - Get match score for user's resume

#### 7.4 Application Routes (`/api/applications`)
- `POST /` - Create application record
- `GET /` - List user's applications
- `GET /{application_id}` - Get application details
- `PATCH /{application_id}` - Update application (status, notes)
- `DELETE /{application_id}` - Delete application
- `POST /{application_id}/tailor` - Generate tailored resume
- `POST /{application_id}/cover-letter` - Generate cover letter

### 8. Frontend Implementation

#### 8.1 Project Setup
- Initialize React + TypeScript + Vite project
- Set up routing (React Router)
- Configure API client (axios)
- Set up state management
- Configure environment variables

#### 8.2 Authentication UI
- Login page
- Registration page
- Protected route wrapper
- Auth context provider

#### 8.3 Dashboard
- Overview statistics (resumes, applications, match scores)
- Quick actions (upload resume, search jobs)
- Recent applications list

#### 8.4 Resume Management
- Resume upload component (drag & drop)
- Resume list view
- Resume detail view (parsed data display)
- Delete functionality

#### 8.5 Job Search & Matching
- Job search form (manual import in Phase 1)
- Job list view with filters
- Job detail view
- Match score display
- "Apply" button (creates application record)

#### 8.6 Application Tracker
- Application list (table/cards)
- Status badges (Submitted, Interviewing, Offer, Rejected)
- Filter by status
- Application detail view
- Notes editor
- Status update form
- View tailored resume and cover letter

### 9. Testing & Documentation

#### 9.1 Backend Tests
- Unit tests for services
- API endpoint tests
- Mock AI provider for testing

#### 9.2 Documentation
- API documentation (FastAPI auto-generated)
- README with setup instructions
- Environment variable documentation
- Architecture overview

## Phase 2 & 3 Architecture (Designed but not implemented)

### Phase 2: Automation
- Job scraping service (BeautifulSoup/Selenium)
- Job platform integrations (LinkedIn, Indeed APIs if available)
- Automated form filling service
- Account creation detection and pause workflow

### Phase 3: Advanced Features
- Notification system (email/push)
- Application analytics dashboard
- Interview preparation assistance
- Networking suggestions

## Key Design Decisions

1. **AI Provider Abstraction**: Allows switching providers without code changes
2. **Modular Services**: Each service is independent and testable
3. **JSON Storage**: Parsed resume data stored as JSON for flexibility
4. **RESTful API**: Standard REST endpoints for frontend integration
5. **Type Safety**: TypeScript frontend + Pydantic schemas backend
6. **Security First**: JWT auth, file validation, secure storage

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname
# Or for SQLite: sqlite:///./app.db

# AI Provider
AI_PROVIDER=huggingface  # huggingface, openai, anthropic, local
HUGGINGFACE_API_KEY=optional
OPENAI_API_KEY=optional
ANTHROPIC_API_KEY=optional
OLLAMA_BASE_URL=http://localhost:11434

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
````

## Implementation Order

1. Backend foundation (database, auth, file upload)
2. AI provider abstraction + basic implementation
3. Resume parsing service
4. Job matching service
5. Resume tailoring service
6. Cover letter generation
7. API endpoints
8. Frontend authentication
9. Frontend dashboard and resume management
10. Frontend job search and matching
11. Frontend application tracker
12. Testing and documentation