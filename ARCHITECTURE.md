# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                    http://localhost:5173                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Components (UI)  │  Pages  │  Router              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  State Management (Zustand)  │  API Client (Axios) │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ API Calls
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Routes Layer                       │   │
│  │  /auth  /resumes  /jobs  /applications  /matching  │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │              Service Layer                          │   │
│  │  • Resume Parser    • Job Matcher                  │   │
│  │  • Resume Tailor    • Cover Letter Gen             │   │
│  │  • File Storage                                     │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │         AI Provider Abstraction                     │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐     │   │
│  │  │HuggingFace│ OpenAI  │Anthropic │  Local   │     │   │
│  │  └──────────┴──────────┴──────────┴──────────┘     │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │            Database Layer (SQLAlchemy)              │   │
│  │  User  │  Resume  │  JobListing  │  Application    │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  DATABASE (SQLite/PostgreSQL)               │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Layer

**Technology**: React 18 + TypeScript + Vite

**Structure**:
```
src/
├── pages/              # Route components (Dashboard, Resumes, etc.)
├── components/         # Reusable UI components (Navbar, Layout)
├── services/           # API client and HTTP logic
├── store/              # Zustand state management
└── types/              # TypeScript type definitions
```

**Key Features**:
- Client-side routing with React Router
- Centralized state management (Zustand)
- JWT token management
- Responsive design with custom CSS
- Type-safe API calls

**Data Flow**:
```
User Action → Component → Store Action → API Service → Backend
                ↑                                          │
                └──────────── Response ←───────────────────┘
```

### Backend API Layer

**Technology**: FastAPI + Python 3.11+

**Structure**:
```
app/
├── api/
│   ├── routes/         # Endpoint definitions
│   └── dependencies.py # Auth dependencies
├── services/           # Business logic
├── ai/                 # AI abstraction
├── models/             # Database models & schemas
└── utils/              # Security, logging
```

**API Endpoints**:

1. **Authentication** (`/api/auth`)
   - POST /register - User registration
   - POST /login - User login
   - GET /me - Get current user

2. **Resumes** (`/api/resumes`)
   - POST /upload - Upload resume file
   - GET / - List user's resumes
   - GET /{id} - Get resume details
   - POST /{id}/parse - Parse resume with AI
   - DELETE /{id} - Delete resume

3. **Jobs** (`/api/jobs`)
   - POST /import - Import job listing
   - GET / - List jobs (with filters)
   - GET /{id} - Get job details

4. **Applications** (`/api/applications`)
   - POST / - Create application
   - GET / - List user's applications
   - GET /{id} - Get application details
   - PATCH /{id} - Update application
   - DELETE /{id} - Delete application

5. **Matching** (`/api/matching`)
   - POST /match - Calculate match score
   - POST /tailor-resume - Generate tailored resume
   - POST /generate-cover-letter - Generate cover letter

### Service Layer

**Purpose**: Business logic separation from API routes

**Services**:

1. **Resume Parser Service**
   - Extracts text from PDF/DOCX
   - Calls AI provider to parse structure
   - Returns structured data (skills, experience, etc.)

2. **Job Matcher Service**
   - Parses job descriptions with AI
   - Calculates match scores
   - Identifies matching/missing skills
   - Generates explanations

3. **Resume Tailor Service**
   - Customizes resumes for specific jobs
   - Highlights relevant experience
   - Optimizes keyword density

4. **Cover Letter Generator**
   - Creates personalized cover letters
   - Addresses specific requirements
   - Maintains professional tone

5. **File Storage Service**
   - Handles file uploads
   - Validates file types and sizes
   - Manages file system storage

### AI Provider Abstraction

**Design Pattern**: Strategy + Factory

**Interface** (`AIProvider` abstract class):
```python
- parse_resume(text) → structured_data
- parse_job_description(text) → requirements
- match_resume_to_job(resume, job) → score
- tailor_resume(resume, job) → tailored_text
- generate_cover_letter(resume, job, info) → letter
- extract_skills(text) → skills_list
```

**Implementations**:

1. **HuggingFace Provider** (Default)
   - Model: Mixtral-8x7B
   - Free inference API
   - No API key required
   - Good for development

2. **OpenAI Provider**
   - Model: GPT-4o-mini
   - High quality results
   - Requires API key
   - Best for production

3. **Anthropic Provider**
   - Model: Claude 3 Haiku
   - Excellent analysis
   - Requires API key
   - Fast and cost-effective

4. **Local Provider**
   - Uses Ollama
   - Runs locally
   - Privacy-focused
   - Requires Ollama installed

**Provider Selection**:
```python
# Configured via environment variable
AI_PROVIDER=huggingface  # or openai, anthropic, local

# Factory pattern implementation
provider = get_ai_provider()  # Returns appropriate provider
```

### Database Layer

**Technology**: SQLAlchemy ORM

**Models**:

```
User
├── id (PK)
├── email (unique)
├── hashed_password
├── full_name
├── preferences (JSON)
├── created_at
└── Relationships:
    ├── resumes (one-to-many)
    └── applications (one-to-many)

Resume
├── id (PK)
├── user_id (FK)
├── filename
├── file_path
├── original_text
├── parsed_data (JSON)
├── is_parsed
├── created_at
└── Relationships:
    ├── user (many-to-one)
    └── applications (one-to-many)

JobListing
├── id (PK)
├── title
├── company
├── description
├── location
├── salary_range
├── work_type
├── url
├── source
├── posted_date
├── parsed_requirements (JSON)
├── created_at
└── Relationships:
    └── applications (one-to-many)

Application
├── id (PK)
├── user_id (FK)
├── resume_id (FK)
├── job_listing_id (FK)
├── status
├── match_score
├── applied_date
├── notes
├── tailored_resume_path
├── cover_letter_path
├── created_at
└── Relationships:
    ├── user (many-to-one)
    ├── resume (many-to-one)
    └── job_listing (many-to-one)
```

### Security Architecture

**Authentication Flow**:
```
1. User registers → Password hashed with bcrypt → Stored in DB
2. User logs in → Password verified → JWT tokens generated
3. User makes request → JWT in Authorization header → Token verified
4. Protected route accessed → User object injected via dependency
```

**Security Features**:
- JWT token-based authentication
- Bcrypt password hashing (cost factor 12)
- CORS configuration
- File upload validation
- SQL injection protection (parameterized queries)
- XSS protection (React escaping)
- Rate limiting ready (can add middleware)

### Data Flow Examples

#### Resume Upload & Parse Flow:
```
1. User uploads file (Frontend)
2. File sent to /api/resumes/upload (Backend)
3. File validated (FileStorageService)
4. File saved to disk
5. Resume record created in DB
6. User clicks "Parse"
7. Request to /api/resumes/{id}/parse
8. Text extracted from file (ResumeParserService)
9. AI provider called (e.g., HuggingFace)
10. Structured data returned
11. Database updated with parsed_data
12. Frontend displays parsed resume
```

#### Job Matching Flow:
```
1. User selects job and clicks "Calculate Match" (Frontend)
2. Request to /api/matching/match with resume_id & job_id
3. Resume data fetched from DB
4. Job requirements fetched/parsed from DB
5. JobMatcherService calls AI provider
6. Match score calculated
7. Skills comparison performed
8. Results returned to frontend
9. UI displays score and matching/missing skills
```

## Deployment Architecture

### Development:
```
Frontend: Vite Dev Server (localhost:5173)
Backend: Uvicorn with reload (localhost:8000)
Database: SQLite (local file)
AI: HuggingFace API
```

### Production:
```
Frontend: Static files on CDN (Vercel/Netlify/S3)
Backend: Gunicorn + Uvicorn workers on server/container
Database: PostgreSQL (managed service)
AI: OpenAI/Anthropic API
Reverse Proxy: Nginx
```

## Scalability Considerations

**Current Design Supports**:
- Horizontal scaling of backend (stateless API)
- Database connection pooling
- Caching layer (Redis) can be added
- Message queue (Celery) for async tasks
- CDN for frontend static assets
- Object storage (S3) for file uploads

**Performance Optimizations**:
- Database indexes on foreign keys
- Async/await for I/O operations
- Connection pooling
- Frontend code splitting
- React state optimization
- API response caching (can add)

## Extensibility Points

The architecture makes it easy to add:
1. New AI providers (implement AIProvider interface)
2. New authentication methods (OAuth, SSO)
3. New file formats (implement parser)
4. New notification channels (email, SMS)
5. New database backends (change DATABASE_URL)
6. Background jobs (add Celery)
7. Caching (add Redis)
8. Real-time features (add WebSockets)

## Technology Choices Rationale

- **FastAPI**: High performance, automatic docs, modern Python
- **React**: Popular, mature, great ecosystem
- **TypeScript**: Type safety, better developer experience
- **SQLAlchemy**: Database agnostic, powerful ORM
- **JWT**: Stateless, scalable authentication
- **Zustand**: Lightweight, simple state management
- **Vite**: Fast build tool, great DX

This architecture provides a solid foundation for a production-ready application that can scale and evolve with business needs.

