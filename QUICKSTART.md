# Quick Start Guide

Get up and running with Resume Compatibility Analyzer in 5 minutes!

## 1. Install Dependencies

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt

# Install Playwright browsers (for autofill feature)
playwright install chromium
```

## 2. (Optional) Install Tesseract OCR

Only needed for image-based resumes:

- **macOS**: `brew install tesseract`
- **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
- **Windows**: [Download installer](https://github.com/UB-Mannheim/tesseract/wiki)

## 3. Run the Application

```bash
python main.py
```

## 4. Test the Application

### Sample Workflow

1. **Upload a Resume**
   - Click "Resume Input" tab
   - Click "Upload File" button
   - Select a PDF, DOCX, or TXT file
   - Or paste resume text directly

2. **Browse Jobs**
   - Click "Job Listings" tab
   - Click "Refresh" to load sample jobs
   - Select a job (e.g., "Senior Software Engineer")
   - Click "Select This Job for Analysis"

3. **Run Analysis**
   - Go to "Analysis Results" tab
   - Click "Analyze Compatibility"
   - View your scores and recommendations

4. **Optimize Resume**
   - Go to "Resume Optimization" tab
   - Click "Generate Optimized Resume"
   - Review suggestions and export

5. **Auto-fill Application** *(NEW!)*
   - Go to "Browser Autofill" tab
   - Paste job application URL
   - Click "Start Autofill"
   - Review and submit manually

## Common Issues

### "No module named 'PySide6'"
```bash
pip install --upgrade PySide6
```

### "Tesseract not found"
```bash
# Install Tesseract OCR (see step 2 above)
# Or disable image uploads for now
```

### App won't start
```bash
# Check Python version (must be 3.11+)
python --version

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

## Testing with Sample Data

The app includes mock job listings by default:
- Senior Software Engineer (Python, React, AWS)
- Data Scientist (Python, ML, SQL)
- Full Stack Developer (JavaScript, Node.js, React)

Simply click "Refresh" in the Job Listings tab to load them!

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [Environment Configuration](.env.example) for API setup
- Review the code structure in `/app` directory
- Run tests: `pytest app/tests/`

## Need Help?

1. Check the README troubleshooting section
2. Review error messages in the GUI
3. Enable debug logging (see README)

**Happy job hunting! 🎯**
