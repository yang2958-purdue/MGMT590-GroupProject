# Resume Compatibility Analyzer

A powerful desktop application for analyzing resume compatibility with job listings and optimizing resumes for ATS (Applicant Tracking System) compatibility.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## Features

### 🔍 Resume Analysis
- **Multi-format Support**: Upload resumes in PDF, DOCX, TXT, JPG, or PNG formats
- **Intelligent Parsing**: Automatically extracts and structures resume data
- **OCR Support**: Extract text from image-based resumes using Tesseract
- **Section Detection**: Identifies key sections (Experience, Education, Skills, etc.)
- **Skill Extraction**: Automatically detects technical and professional skills

### 💼 Job Matching
- **Compatibility Scoring**: Get a 0-100 score for resume-job match
- **Component Breakdown**: See scores for keywords, skills, experience, education, and semantic relevance
- **Keyword Analysis**: View matched and missing keywords
- **Skill Gap Analysis**: Identify which skills you have and which are missing

### 📊 ATS Evaluation
- **ATS-Friendly Scoring**: Evaluate resume for ATS compatibility
- **Formatting Checks**: Identify formatting issues that may confuse ATS systems
- **Best Practice Recommendations**: Get actionable suggestions to improve ATS scores
- **Section Validation**: Ensure all required sections are present

### ✨ Resume Optimization
- **Tailored Optimization**: Generate optimized resumes specific to job listings
- **Keyword Enhancement**: Suggestions for adding missing keywords
- **Side-by-Side Comparison**: Compare original and optimized versions
- **Export Options**: Save optimized resume as TXT file or copy to clipboard

## Architecture

The application follows a clean, modular architecture:

```
├── Domain Layer          # Core business logic and models
│   ├── Models            # Resume, JobListing, AnalysisResult
│   ├── Scoring           # Keyword matching, semantic analysis, ATS rules
│   └── Utils             # Text cleaning, section parsing, skill extraction
│
├── Application Layer     # Orchestration and services
│   ├── Services          # Resume ingestion, compatibility, optimization
│   └── Controllers       # Workflow coordination
│
├── Infrastructure Layer  # External integrations
│   ├── Parsers           # PDF, DOCX, TXT, Image parsers
│   ├── OCR               # Local and API-based OCR
│   ├── API               # Jobs API, Agent API clients
│   └── Persistence       # Settings and cache storage
│
└── Presentation Layer    # GUI
    ├── Main Window       # Tabbed interface
    ├── Panels            # Resume, Jobs, Analysis, Optimization
    └── Widgets           # Score cards, tables, overlays
```

## Installation

### Prerequisites

- Python 3.11 or higher
- Tesseract OCR (optional, for image-based resumes)
  - **macOS**: `brew install tesseract`
  - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
  - **Windows**: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### Setup Steps

1. **Clone the repository**
```bash
cd /path/to/MGMT590-GroupProject
```

2. **Create virtual environment**
```bash
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment (optional)**
```bash
# Create .env file for custom configuration
cp .env.example .env

# Edit .env to set API endpoints and keys
nano .env
```

### Environment Variables

Create a `.env` file in the project root:

```env
# API Endpoints
JOBS_API_BASE_URL=https://api.example.com
AGENT_API_BASE_URL=https://agent-api.example.com
OCR_API_BASE_URL=https://ocr-api.example.com

# API Keys
AGENT_API_KEY=your_agent_api_key_here
OCR_API_KEY=your_ocr_api_key_here

# Feature Flags
USE_AGENTIC_ANALYSIS=false
USE_REMOTE_OCR=false

# File Upload Settings
MAX_FILE_SIZE=10485760  # 10MB
```

## Usage

### Running the Application

```bash
python main.py
```

### Basic Workflow

1. **Load Resume**
   - Go to "Resume Input" tab
   - Upload a file or paste text
   - Review extracted text and parsed information

2. **Select Job**
   - Go to "Job Listings" tab
   - Click "Refresh" or search for specific jobs
   - Select a job from the list
   - Click "Select This Job for Analysis"

3. **Analyze Compatibility**
   - Go to "Analysis Results" tab
   - Click "Analyze Compatibility"
   - Review scores, matched/missing keywords, and recommendations

4. **Optimize Resume**
   - Go to "Resume Optimization" tab
   - Click "Generate Optimized Resume"
   - Review changes and export the optimized version

### Supported File Formats

- **PDF** (`.pdf`) - Text-based and image-based PDFs
- **Word Document** (`.docx`) - Microsoft Word format
- **Plain Text** (`.txt`) - Simple text files
- **Images** (`.jpg`, `.jpeg`, `.png`) - Requires OCR

## Scoring System

### Compatibility Score (0-100)

Weighted combination of:
- **30%** Keyword Match - How well resume keywords match job requirements
- **25%** Skill Match - Technical and professional skills alignment
- **20%** Semantic Relevance - Contextual similarity using NLP
- **15%** Experience Match - Years and type of experience
- **10%** Education Match - Degree and field alignment

### ATS Score (0-100)

Weighted combination of:
- **35%** Keyword Presence - Job-specific keywords in relevant sections
- **20%** Section Headings - Standard, ATS-friendly section names
- **15%** Formatting Safety - No tables, unusual characters, or images
- **15%** Measurable Bullets - Quantifiable achievements with action verbs
- **15%** Structure Quality - Contact info, dates, appropriate length

## API Integration

The application supports optional API-based enhancements:

### Jobs API

Fetches real job listings. Currently uses mock data as fallback.

**Endpoints:**
- `GET /jobs` - List job postings
- `GET /jobs/{id}` - Get job details

### Agent API (LLM)

Provides AI-powered semantic analysis and optimization.

**Endpoints:**
- `POST /agent/analyze` - Semantic similarity and skill matching
- `POST /agent/optimize-resume` - AI-powered resume rewriting
- `POST /agent/ocr` - Cloud-based OCR extraction

### Using Custom APIs

1. Set environment variables for API endpoints
2. Set `USE_AGENTIC_ANALYSIS=true` to enable AI features
3. Provide API keys if required

## Development

### Project Structure

```
MGMT590-GroupProject/
├── app/
│   ├── application/          # Application services
│   ├── domain/               # Domain logic
│   ├── infrastructure/       # External integrations
│   ├── gui/                  # GUI components
│   ├── config/               # Configuration
│   └── tests/                # Unit tests
├── main.py                   # Application entry point
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

### Running Tests

```bash
# Run all tests
pytest app/tests/

# Run specific test file
pytest app/tests/test_scoring.py

# Run with coverage
pytest --cov=app app/tests/
```

### Code Style

The project follows PEP 8 style guidelines:

```bash
# Format code
black app/

# Check style
flake8 app/
```

## Technical Details

### NLP & Scoring

- **Keyword Extraction**: Regular expressions and stop word filtering
- **Semantic Matching**: TF-IDF vectorization with cosine similarity
- **Skill Normalization**: Maps variations to canonical skill names
- **Experience Estimation**: Heuristic date range parsing

### ATS Rules

Based on common ATS requirements:
- Standard section headings (Experience, Education, Skills)
- Contact information presence
- Action verb usage in bullet points
- Quantifiable achievements with numbers
- Avoidance of tables, headers/footers, and unusual characters
- Appropriate resume length (200-1500 words)

### GUI Framework

Built with **PySide6** (Qt for Python):
- Responsive tabbed interface
- Background threading for long operations
- Real-time status updates
- Cross-platform compatibility

## Troubleshooting

### Common Issues

**1. Tesseract not found**
```
Error: Tesseract OCR is not installed
Solution: Install Tesseract OCR (see Prerequisites)
```

**2. PDF parsing fails**
```
Error: Failed to parse PDF
Solution: Try saving PDF as text-based or use OCR mode
```

**3. No jobs appear**
```
Solution: Click "Refresh" button - app uses mock data by default
```

**4. Import errors**
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Debug Mode

Enable detailed logging:

```python
# Add to main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Limitations & Future Enhancements

### Current Limitations

- Mock job data by default (requires API integration for real jobs)
- Local optimization is rule-based (not AI-powered without API key)
- Export only supports TXT format (DOCX export planned)
- No batch processing of multiple resumes

### Planned Features

- 📊 Batch comparison: Analyze one resume against multiple jobs
- 📈 Analytics dashboard: Track application success rates
- 📝 Cover letter generation: AI-powered cover letter drafts
- 🔗 LinkedIn integration: Import profile data
- 📤 Advanced export: DOCX with formatting preservation
- 💾 Analysis history: Save and review past analyses

## Contributing

Contributions are welcome! Areas for improvement:

- Additional file format support (RTF, HTML)
- Enhanced skill taxonomy and normalization
- More sophisticated semantic analysis
- Integration with job board APIs
- Improved ATS rule coverage
- UI/UX enhancements

## License

MIT License - See LICENSE file for details

## Acknowledgments

- **PySide6**: Qt GUI framework
- **scikit-learn**: NLP and machine learning
- **pytesseract**: OCR capabilities
- **pypdf & python-docx**: Document parsing

## Support

For issues, questions, or suggestions:
1. Check existing documentation
2. Review troubleshooting section
3. Open an issue on the project repository

---

**Built for MGMT 590 - Emerging Technologies Course**

*Helping job seekers optimize their resumes and find the best opportunities!* 🚀
