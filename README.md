# Resume Auto-Fill Bot

A minimal, modular CLI-based tool for matching resumes to job postings using TF-IDF similarity scoring.

## Overview

This lightweight command-line application helps job seekers identify the best-matching job postings for their resume. It uses machine learning (TF-IDF vectorization and cosine similarity) to rank job opportunities and generate tailored resume summaries.

## Features

- **Resume Input**: Upload from file (.txt) or paste text directly
- **Multi-Company Search**: Search across multiple companies simultaneously
- **Intelligent Matching**: TF-IDF-based similarity scoring with difflib fallback
- **Ranked Results**: Jobs sorted by relevance to your resume
- **Tailored Exports**: Generate customized resume summaries for specific jobs
- **Interactive CLI**: User-friendly menu-driven interface
- **Modular Design**: Clean separation of concerns for easy extension

## Technology Stack

- **Language**: Python 3.8+
- **ML/NLP**: scikit-learn (TF-IDF), difflib
- **Data Processing**: numpy
- **Web Scraping Ready**: requests, beautifulsoup4 (for future real scraping)

## Project Structure

```
MGMT590-GroupProject/
├── main.py              # CLI application entry point
├── resume_parser.py     # Resume input and validation
├── job_search.py        # Job search (currently mock data)
├── similarity.py        # TF-IDF similarity computation
├── exporter.py          # Tailored resume export
├── utils.py             # Helper functions
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── PROMPTS.md          # Project prompts log
```

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Clone or download the repository**

```bash
cd "C:\DEVOPS FOLDER\MGMT590-GroupProject"
```

2. **Create a virtual environment (recommended)**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

## Running the Application

### Start the CLI

```bash
python main.py
```

### Basic Workflow

1. **Upload Resume** (Option 1)
   - Choose to load from file or paste text
   - File path example: `C:\Users\YourName\Documents\resume.txt`
   - Or paste your resume text directly

2. **Enter Target Companies** (Option 2)
   - Enter comma-separated company names
   - Example: `Google, Microsoft, Apple, Amazon`

3. **Enter Desired Role** (Option 3)
   - Specify the job title you're seeking
   - Example: `Software Engineer Intern`

4. **Run Job Search** (Option 4)
   - Searches for jobs at specified companies
   - Computes similarity scores automatically
   - Currently uses mock data (easily swappable for real APIs)

5. **View Ranked Results** (Option 5)
   - See jobs sorted by match score
   - View detailed information for any job

6. **Export Tailored Resume** (Option 6)
   - Generate customized resume summaries
   - Export for single job or multiple top matches
   - Creates comparison reports

7. **View Session Info** (Option 7)
   - Check current session state
   - Verify loaded resume, companies, and role

8. **Clear Session** (Option 8)
   - Start over with fresh data

9. **Exit** (Option 9)
   - Safely exit the application

## Usage Examples

### Example 1: Quick Job Search

```
1. Select Option 1 → Option 1 → Enter: resume.txt
2. Select Option 2 → Enter: Google, Microsoft, Apple
3. Select Option 3 → Enter: Software Engineer Intern
4. Select Option 4 → Wait for search and ranking
5. Select Option 5 → Review ranked results
6. Select Option 6 → Option 1 → Enter job number → Export
```

### Example 2: Pasting Resume Directly

```
1. Select Option 1 → Option 2 → Paste your resume text
2. Press Ctrl+Z then Enter (Windows) or Ctrl+D (macOS/Linux)
3. Continue with Options 2-6 as above
```

## Features in Detail

### Resume Parser

- **Validation**: Ensures resume meets minimum requirements (100+ characters)
- **Normalization**: Cleans whitespace and formatting
- **Sanitization**: Enforces length limits and removes problematic characters
- **Preview**: Shows resume preview for verification

### Job Search

- **Mock Data**: Currently provides realistic job descriptions
- **Extensible**: Designed to swap in real scraping or API calls
- **Error Handling**: Gracefully handles search failures
- **Categorization**: Automatically categorizes roles (intern, engineer, data scientist, etc.)

### Similarity Scoring

- **TF-IDF Vectorization**: Industry-standard text similarity
- **Cosine Similarity**: Measures document similarity (0-1 scale)
- **Automatic Fallback**: Uses difflib if TF-IDF fails
- **Keyword Extraction**: Identifies overlapping skills and terms

### Export Features

- **Tailored Summaries**: Highlights matching keywords and skills
- **Recommendations**: Provides actionable resume improvement tips
- **Batch Export**: Export for multiple top jobs at once
- **Comparison Reports**: Overview of all job matches with scores
- **Timestamped Files**: Prevents overwriting previous exports

## Error Handling

The application includes comprehensive error handling:

- **File Errors**: Clear messages for missing/inaccessible files
- **Input Validation**: Prompts for valid input on errors
- **Search Failures**: Continues operation even if individual searches fail
- **No Stack Traces**: User-friendly error messages only
- **Graceful Degradation**: Fallback mechanisms for critical operations

## Extending the Application

### Adding Real Job Scraping

Replace the mock implementation in `job_search.py`:

```python
def search_jobs(company_name: str, role: str) -> List[Dict[str, str]]:
    # Implement actual web scraping here
    # Example: Use requests + BeautifulSoup
    # Return list of job dictionaries
    pass
```

### Adding New Similarity Metrics

Extend `similarity.py` to add custom scoring:

```python
def compute_similarity_custom(resume_text, job_descriptions):
    # Implement your similarity metric
    return scores
```

### Customizing Export Format

Modify `exporter.py` to change output format:

```python
def generate_tailored_summary(resume_text, job):
    # Customize the export format
    # Add new sections or modify existing ones
    pass
```

## Limitations and Future Enhancements

### Current Limitations

- Mock job search data (not real job postings)
- Text file resume input only (no PDF/DOCX parsing)
- No application tracking
- No login/authentication system
- No database persistence

### Potential Enhancements

- Real job scraping from Indeed, LinkedIn, Glassdoor
- PDF/DOCX resume parsing
- Multiple resume support
- Application tracking system
- Email notifications
- Web interface option
- Database for history tracking
- API for programmatic access

## Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
# Ensure virtual environment is activated and dependencies installed
pip install -r requirements.txt
```

**File not found when loading resume:**
- Use absolute path: `C:\Users\YourName\Documents\resume.txt`
- Or navigate to project directory first

**No jobs found:**
- This is expected with mock data
- Try different role keywords (intern, engineer, scientist, devops, frontend)

**Low similarity scores:**
- Ensure resume contains technical keywords
- Try different job roles that match your background
- Mock data may not perfectly align with all resumes

**Export file not found:**
- Check current directory for exported files
- Look for files starting with `tailored_resume_`

## Development

### Code Quality

- **Type Hints**: All functions include type annotations
- **Documentation**: Comprehensive docstrings
- **Modular**: Clean separation of concerns
- **Testable**: Functions designed for easy testing
- **Comments**: Clear explanations throughout

### Testing

To add unit tests (pytest):

```bash
pip install pytest
pytest
```

### Code Style

Follow PEP 8 guidelines:

```bash
pip install black flake8
black .
flake8 .
```

## Contributing

This is a minimal, educational project. Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make changes with clear comments
4. Test thoroughly
5. Submit pull request

## License

This project is for educational purposes. Modify and use as needed.

## Support

For issues or questions:
- Review this README
- Check code comments
- Examine PROMPTS.md for project requirements

## Acknowledgments

Built with:
- **scikit-learn** for machine learning capabilities
- **numpy** for numerical operations
- **Python** for excellent standard library support

---

**Note**: This is a minimal, modular implementation designed for clarity and extensibility. It prioritizes clean code and educational value over feature completeness.
