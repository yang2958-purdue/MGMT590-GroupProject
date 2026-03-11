# Testing Instructions

## Quick Test with Sample Resumes

I've created 6 sample resume files for testing:

### Technical Roles

### 1. `sample_resume.txt`
- **Profile**: Sarah Chen - Senior Software Engineer
- **Skills**: Python, JavaScript, React, AWS, Docker, Kubernetes
- **Experience**: 6+ years
- **Best match for**: Senior Software Engineer job

### 2. `sample_resume_detailed.txt`
- **Profile**: Michael Rodriguez - Full Stack Developer
- **Skills**: React, TypeScript, Node.js, Python, FastAPI, AWS
- **Experience**: 7+ years
- **Best match for**: Senior Software Engineer or Full Stack Developer jobs

### 3. `sample_resume_data_scientist.txt`
- **Profile**: Alexandra Patel - Data Scientist
- **Skills**: Python, Machine Learning, TensorFlow, SQL, AWS
- **Experience**: 5+ years
- **Best match for**: Data Scientist job

### Business Roles

### 4. `sample_resume_business_analyst.txt`
- **Profile**: Jennifer Martinez - Senior Business Analyst
- **Skills**: SQL, Tableau, Power BI, JIRA, Requirements Analysis, Agile
- **Experience**: 6+ years
- **Best match for**: Senior Business Analyst, Business Intelligence Analyst jobs

### 5. `sample_resume_project_manager.txt`
- **Profile**: David Thompson - IT Project Manager (PMP Certified)
- **Skills**: Project Management, Agile, Scrum, MS Project, JIRA, Budget Management
- **Experience**: 9+ years
- **Best match for**: IT Project Manager job

### 6. `sample_resume_consultant.txt`
- **Profile**: Sophia Williams - Management Consultant (Harvard MBA)
- **Skills**: Strategy, Financial Modeling, Excel, PowerPoint, Process Improvement
- **Experience**: 5+ years
- **Best match for**: Management Consultant, Digital Transformation Consultant jobs

## Test Workflow

### Option 1: File Upload Test

1. **Run the app**
   ```bash
   python main.py
   ```

2. **Go to "Resume Input" tab**
   - Click "Upload File" button
   - Select `sample_resume.txt` (or any of the sample files)
   - Wait for parsing (should be instant for TXT files)
   - Review the extracted text and parsed information

3. **Go to "Job Listings" tab**
   - Click "Refresh" button
   - You'll see 8 mock jobs:
     - **Technical**: Senior Software Engineer, Data Scientist, Full Stack Developer
     - **Business**: Senior Business Analyst, IT Project Manager, Management Consultant
     - **Hybrid**: Business Intelligence Analyst, Digital Transformation Consultant
   - Select a job that matches your loaded resume
   - Click "Select This Job for Analysis"

4. **Go to "Analysis Results" tab**
   - Click "Analyze Compatibility"
   - Review your scores:
     - Compatibility Score (should be 80+)
     - ATS Score
     - Matched/Missing Keywords
     - Skills analysis
     - Recommendations

5. **Go to "Resume Optimization" tab**
   - Click "Generate Optimized Resume"
   - Review suggestions
   - Click "Export Optimized Resume" to save
   - Or click "Copy to Clipboard"

### Option 2: Paste Text Test

1. **Go to "Resume Input" tab**
2. **Copy one of the sample resume files**
   ```bash
   cat sample_resume.txt | pbcopy  # macOS
   # Or manually open the file and copy
   ```
3. **Paste into the text area**
4. **Click "Parse Text"**
5. **Follow steps 3-5 from Option 1**

## Expected Results

### For Sarah Chen (sample_resume.txt) vs Senior Software Engineer:

- **Compatibility Score**: 75-85 (Strong match)
- **ATS Score**: 80-90 (Good structure)
- **Matched Skills**: Python, JavaScript, React, AWS, Docker
- **Missing Skills**: CI/CD (mentioned as preferred)
- **Matched Keywords**: ~15-20 terms
- **Recommendations**: 5-7 actionable suggestions

### For Alexandra Patel (data_scientist) vs Data Scientist:

- **Compatibility Score**: 85-95 (Excellent match)
- **ATS Score**: 85-95 (Well-structured)
- **Matched Skills**: Python, SQL, Machine Learning, TensorFlow, Pandas
- **Missing Skills**: None or minimal
- **Strong alignment** with job requirements

### For Michael Rodriguez vs Senior Software Engineer:

- **Compatibility Score**: 80-90 (Very strong match)
- **ATS Score**: 85-95 (Comprehensive resume)
- **Matched Skills**: Most required skills present
- **Experience**: 7+ years exceeds 5+ requirement

## UI Features to Test

### Dark Theme (NEW!)
- ✅ Dark background (#1e1e1e)
- ✅ High contrast text (#e0e0e0)
- ✅ Cyan accent colors (#0d7377, #14ffec)
- ✅ Color-coded scores (green/yellow/red)
- ✅ Better readability on all panels

### Interactive Elements
- Hover effects on buttons (cyan glow)
- Tab selection highlights
- Table row selection
- Scrollbars (dark themed)
- Loading states during processing

## Troubleshooting Test Scenarios

### Test Error Handling

1. **Empty text paste**: Click "Parse Text" without pasting anything
   - Expected: Warning message

2. **Invalid file**: Try to upload a .exe or unsupported file
   - Expected: Error message about unsupported format

3. **No resume loaded**: Try to analyze without loading resume
   - Expected: Warning to load resume first

4. **No job selected**: Load resume but try to analyze without selecting job
   - Expected: Warning to select a job

## Performance Benchmarks

- **Text parsing**: < 1 second
- **PDF parsing**: 1-3 seconds
- **Image OCR**: 2-5 seconds (if Tesseract installed)
- **Compatibility analysis**: 2-4 seconds
- **Resume optimization**: 1-3 seconds (local mode)

## What to Look For

✅ **Good Signs:**
- Application launches without errors
- Dark theme looks clean and readable
- Resume parses correctly
- Jobs load successfully
- Scores are calculated
- Export works

⚠️ **Potential Issues:**
- Tesseract not installed (only affects image uploads)
- Network timeout on API calls (falls back to mock data)
- Long processing time (should use background threads)

## Mock Data Details

The app includes 8 hardcoded job listings:

### Technical Roles
1. **Senior Software Engineer** - Python, JavaScript, React, AWS, Docker
2. **Data Scientist** - Python, ML, SQL, TensorFlow, Pandas
3. **Full Stack Developer** - JavaScript, TypeScript, Node.js, React, MongoDB

### Business Roles
4. **Senior Business Analyst** - SQL, Tableau, Power BI, Requirements Analysis, Agile
5. **IT Project Manager** - Project Management, Agile, Scrum, JIRA, Budget Management
6. **Management Consultant** - Strategy, Excel, PowerPoint, Problem Solving

### Hybrid Roles
7. **Business Intelligence Analyst** - SQL, Tableau, Power BI, ETL, Data Warehousing
8. **Digital Transformation Consultant** - Cloud, Agile, Change Management, Strategy

These are perfect for testing with the provided sample resumes!

---

**Ready to test?** Run `python main.py` and start with `sample_resume.txt`! 🚀
