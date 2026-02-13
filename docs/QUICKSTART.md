# Quick Start Guide

Get the Resume Auto-Fill Bot running in 5 minutes!

## 1. Install Dependencies

```bash
# Windows
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 2. Run the Application

```bash
python main.py
```

## 3. Quick Test with Sample Resume

Follow these steps in the CLI menu:

1. **Select Option 1** (Upload or paste resume)
   - Choose **Option 1** (Browse and select file) - A file browser will open!
   - Navigate to and select `sample_resume.txt`
   - OR choose **Option 2** and type: `sample_resume.txt`
   - You should see "[OK] Successfully loaded resume..."

2. **Select Option 2** (Enter target companies)
   - Enter: `Google, Microsoft, Amazon, Apple`
   - You should see "✓ Set 4 target companies..."

3. **Select Option 3** (Enter desired role)
   - Enter: `Software Engineer Intern`
   - You should see "✓ Set desired role..."

4. **Select Option 4** (Run job search)
   - Wait a moment for processing
   - You should see "✓ Found X job postings" and "✓ Ranked X jobs by relevance"

5. **Select Option 5** (View ranked results)
   - Browse through the ranked job matches
   - Note the match scores (shown as percentages)
   - Optionally enter a job number to see details

6. **Select Option 6** (Export tailored resume)
   - Choose **Option 1** (Export for specific job)
   - Enter the job number (e.g., `1` for the top match)
   - A tailored resume file will be created in your current directory

7. **Select Option 9** (Exit)
   - Safely exit the application

## 4. View Your Exported Resume

Look for files named:
```
tailored_resume_[Company]_[Position]_[Timestamp].txt
```

Example:
```
tailored_resume_Google_Software_Engineer_20260213_143022.txt
```

## Tips

- **Use Your Own Resume**: Create a `.txt` file with your actual resume for better results
- **Try Different Roles**: Test with various job titles (Data Scientist, Frontend Engineer, DevOps Engineer)
- **Batch Export**: Use Option 6 → Option 2 to export multiple tailored resumes at once
- **Session Info**: Use Option 7 to check what's currently loaded

## Troubleshooting

**Import errors?**
```bash
pip install --upgrade -r requirements.txt
```

**Sample resume not found?**
```bash
# Make sure you're in the project directory
cd "C:\DEVOPS FOLDER\MGMT590-GroupProject"
```

**Low match scores?**
- This is normal with mock data
- Try different role keywords that match the sample resume
- Use your own resume for more accurate matching

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Modify `job_search.py` to add real job scraping
- Customize `exporter.py` to change output format
- Add your own similarity metrics in `similarity.py`

Happy job hunting! 🚀

