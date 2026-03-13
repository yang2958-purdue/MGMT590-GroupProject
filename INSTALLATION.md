# Installation Guide - Resume Compatibility Analyzer with Browser Autofill

## System Requirements

- **Python**: 3.11 or higher
- **Operating System**: macOS, Windows, or Linux
- **RAM**: 2 GB minimum, 4 GB recommended
- **Disk Space**: 500 MB for dependencies

## Step-by-Step Installation

### 1. Install Python

Check if Python is installed:
```bash
python --version
# Should show: Python 3.11.x or higher
```

If not installed:
- **macOS**: `brew install python@3.11`
- **Windows**: Download from [python.org](https://www.python.org/downloads/)
- **Linux**: `sudo apt-get install python3.11`

### 2. Clone or Download Project

```bash
cd ~/path/to/project
# If using git:
git clone [repository-url]
cd MGMT590-GroupProject
```

### 3. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# You should see (venv) in your terminal prompt
```

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt

# This installs:
# - PySide6 (GUI framework)
# - Playwright (browser automation)
# - scikit-learn (ML/NLP)
# - pypdf, python-docx (document parsing)
# - And 10+ other packages
```

### 5. Install Playwright Browsers

**Required for Browser Autofill feature:**

```bash
playwright install chromium

# This downloads Chromium browser (~150 MB)
# Takes 1-2 minutes depending on connection
```

Expected output:
```
Downloading Chromium 119.0.6045.9...
Chromium 119.0.6045.9 downloaded to /Users/you/Library/Caches/ms-playwright/chromium-1084
```

### 6. (Optional) Install Tesseract OCR

**For image-based resumes:**

```bash
# macOS:
brew install tesseract

# Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# Windows:
# Download installer from:
# https://github.com/UB-Mannheim/tesseract/wiki
```

### 7. (Optional) Configure Settings

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (optional)
nano .env

# Key settings:
# ENABLE_BROWSER_AUTOFILL=true
# BROWSER_HEADLESS=false
# USE_AGENTIC_ANALYSIS=false
```

### 8. Verify Installation

```bash
# Check all dependencies
python -c "import PySide6, playwright, sklearn; print('All imports successful!')"

# Should print: "All imports successful!"
```

### 9. Run Application

```bash
python main.py

# Application should launch with GUI
```

## Troubleshooting

### Issue: "Module not found: PySide6"
```bash
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Issue: "playwright not found"
```bash
# Install Playwright again
pip install playwright
playwright install chromium
```

### Issue: "Tesseract not found"
```bash
# On macOS:
brew install tesseract

# On Linux:
sudo apt-get install tesseract-ocr

# On Windows - add Tesseract to PATH
```

### Issue: Application won't start
```bash
# Check Python version
python --version  # Must be 3.11+

# Check if virtual environment is activated
which python  # Should point to venv

# Try running with verbose output
python -v main.py
```

### Issue: Browser autofill not working
```bash
# Verify Playwright installation
playwright --version

# Reinstall browsers
playwright install --force chromium
```

## Quick Test

After installation:

```bash
# 1. Start application
python main.py

# 2. In the GUI:
#    - Tab 1: Upload "sample_resume.txt"
#    - Tab 2: Click "Refresh Jobs"
#    - Tab 3: Select a job, click "Analyze"
#    - Tab 5: Test autofill (optional)
```

## Uninstallation

```bash
# Deactivate virtual environment
deactivate

# Remove virtual environment
rm -rf venv/

# Remove Playwright browsers
playwright uninstall
```

## Platform-Specific Notes

### macOS
- May need to allow terminal access to automation
- System Preferences → Security & Privacy → Automation

### Windows
- May need to allow Python through firewall
- Use PowerShell for best compatibility

### Linux
- May need to install system dependencies:
  ```bash
  sudo apt-get install python3-tk
  sudo apt-get install libxcb-xinerama0
  ```

## Minimal Installation (No Autofill)

If you don't need browser autofill:

```bash
# Skip playwright installation
pip install PySide6 scikit-learn pypdf python-docx pillow

# Set in .env:
ENABLE_BROWSER_AUTOFILL=false

# Run normally
python main.py
```

## Docker Installation (Optional)

For containerized deployment:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chromium

COPY . .
CMD ["python", "main.py"]
```

## Next Steps

After installation:
1. Read `QUICKSTART.md` for usage guide
2. Review `TEST_INSTRUCTIONS.md` for testing
3. Check `BROWSER_AUTOFILL.md` for autofill guide

## Support

For issues:
1. Check `README.md` FAQ section
2. Review error messages carefully
3. Ensure all dependencies installed
4. Verify Python version is 3.11+

---

**Installation complete!** Ready to automate your job search! 🚀
