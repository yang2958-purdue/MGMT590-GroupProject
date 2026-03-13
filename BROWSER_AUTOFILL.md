```

# Browser Autofill Feature

## 🤖 Overview

The Resume Compatibility Analyzer now includes **intelligent browser automation** to autofill job application forms using your parsed resume data. This feature uses Playwright for browser automation and smart field mapping to identify and fill form fields automatically.

## ✨ Key Features

- **Intelligent Field Detection**: Automatically identifies form fields using labels, placeholders, IDs, and ARIA attributes
- **Platform-Specific Adapters**: Optimized support for major applicant tracking systems
- **Human Review Mode**: Fills forms but requires manual review before submission
- **No Auto-Submit**: Applications are NEVER submitted automatically
- **Multi-Platform Support**: Works with Workday, Greenhouse, Lever, and generic HTML forms
- **Visual or Headless**: Run browser visibly for monitoring or in background
- **Detailed Logging**: Comprehensive error handling and field mapping reports

## 🎯 Supported Platforms

### Fully Supported
- ✅ **Generic HTML Forms** - Standard web forms across the internet
- ✅ **Workday** (myworkdayjobs.com) - Custom dropdown and workflow handling
- ✅ **Greenhouse** (boards.greenhouse.io) - Optimized field selectors
- ✅ **Lever** (jobs.lever.co) - Platform-specific patterns
- ✅ **Taleo** - Oracle's ATS platform
- ✅ **iCIMS** - Popular recruiting platform

### Field Types Detected
- ✓ Personal information (name, email, phone, address)
- ✓ Professional details (LinkedIn, website, current company)
- ✓ Education (degree level, university, major, graduation year)
- ✓ Work experience (years of experience, current role)
- ✓ Application specifics (start date, work authorization, how you heard)

## 📋 Setup Instructions

### 1. Install Playwright

After installing the main requirements, install Playwright browsers:

```bash
# Install Python package (already in requirements.txt)
pip install playwright

# Install browser binaries (required first-time only)
playwright install chromium
```

### 2. Enable Feature (if disabled)

The feature is enabled by default. To toggle:

```bash
# In .env file or environment
export ENABLE_BROWSER_AUTOFILL=true

# Optional: Run in headless mode by default
export BROWSER_HEADLESS=false
```

### 3. Verify Installation

```bash
# Test Playwright installation
playwright --version

# Should show: Version 1.40.0 or higher
```

## 🚀 How to Use

### Step-by-Step Guide

1. **Load Your Resume**
   - Go to "Resume Input" tab
   - Upload your resume file or paste text
   - Wait for parsing to complete

2. **Navigate to Browser Autofill Tab**
   - Click on "🤖 Browser Autofill" tab
   - You should see "Resume loaded" status

3. **Enter Application URL**
   - Paste the job application form URL
   - Examples:
     ```
     https://company.myworkdayjobs.com/Career/job/...
     https://boards.greenhouse.io/company/jobs/...
     https://jobs.lever.co/company/...
     ```

4. **Configure Options**
   - **Run in background**: Check to hide browser (useful for batch processing)
   - **Pause for review**: Keep checked to review before closing (recommended)

5. **Start Autofill**
   - Click "🤖 Start Autofill"
   - Confirm the operation
   - Browser will open and navigate to the form

6. **Review Results**
   - If running visibly, watch the form being filled
   - Browser will pause when complete
   - Review all filled fields for accuracy
   - Make manual corrections as needed
   - **Manually submit** the application when ready

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable browser autofill
ENABLE_BROWSER_AUTOFILL=true

# Run browser in headless mode (invisible)
BROWSER_HEADLESS=false

# Browser timeout in milliseconds
BROWSER_TIMEOUT=30000

# Auto-submit forms (NOT RECOMMENDED - disabled by default)
AUTO_SUBMIT_FORMS=false
```

### Settings in Code

Edit `app/config/settings.py`:

```python
# Browser Automation
BROWSER_HEADLESS = False  # Show browser
BROWSER_TIMEOUT = 30000   # 30 seconds
AUTO_SUBMIT_FORMS = False # Never auto-submit
```

## 🔍 How It Works

### 1. Field Detection Strategy

The system uses multiple detection methods in order of reliability:

```
1. Element ID (most reliable)
   → #first_name

2. Name attribute
   → input[name="firstName"]

3. Type + Placeholder
   → input[type="text"][placeholder*="First"]

4. ARIA labels
   → input[aria-label="First Name"]

5. Nearby label text
   → label:has-text("First") + input
```

### 2. Field Mapping Process

```python
1. Scan page for all input elements
2. Extract element attributes (id, name, placeholder, aria-label)
3. Match against pattern database
4. Calculate confidence score for each match
5. Build field → selector mapping
6. Extract values from parsed resume
7. Fill fields one by one
8. Log results and errors
```

### 3. Platform Detection

```python
if 'workday' in url:
    adapter = WorkdayAdapter()
elif 'greenhouse' in url:
    adapter = GreenhouseAdapter()
else:
    adapter = GenericAdapter()
```

### 4. Resume Data Extraction

Resume data is extracted from your parsed resume:

```python
{
    'first_name': 'John',
    'last_name': 'Doe',
    'email': 'john@email.com',
    'phone': '555-1234',
    'years_experience': '7',
    'education_level': "Bachelor's Degree",
    'linkedin': 'linkedin.com/in/johndoe'
}
```

## 📊 Results and Reporting

After autofill completes, you'll see:

### Success Metrics
- ✅ **Fields Filled**: Number of successfully filled fields
- ⚠️ **Fields Failed**: Number of failed attempts
- 📋 **Mappings**: List of detected fields and their selectors
- 📸 **Screenshot**: Full-page screenshot saved to project directory

### Example Output
```
=== AUTOFILL COMPLETE ===
Filled: 12 fields
Failed: 2 fields

Mapped Fields:
• first_name → #firstName
• email → input[type="email"]
• phone → input[name="phone"]
...

Errors:
• Failed to fill: graduation_year
• Element not found: cover_letter
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Playwright not found"

```bash
# Install browser binaries
playwright install chromium
```

#### 2. "Element not found" errors

**Cause**: Page loading too fast or selectors changed
**Solution**: 
- Form may have loaded before detection
- Refresh and try again
- Check if form requires login first

#### 3. Fields filled incorrectly

**Cause**: Field mapping confidence too low
**Solution**:
- Review filled data in pause mode
- Manually correct any errors
- Consider adding custom selector for that site

#### 4. Browser doesn't open

**Cause**: Headless mode enabled
**Solution**:
- Uncheck "Run in background" option
- Or set `BROWSER_HEADLESS=false`

#### 5. Form won't submit

**Expected**: Forms are NEVER auto-submitted
**Action**: Review and manually click Submit

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔒 Security & Privacy

### Data Handling
- ✅ All data stays local - no external API calls
- ✅ Browser automation runs on your machine
- ✅ No resume data is stored by the automation
- ✅ Forms are never auto-submitted
- ✅ You maintain full control

### Best Practices
1. **Always review** filled data before submitting
2. **Run visibly** first time on new platform
3. **Save screenshots** for your records
4. **Test with non-critical** applications first
5. **Keep Playwright updated** for security patches

## 📈 Advanced Usage

### Custom Site Adapters

Create platform-specific adapters:

```python
# app/infrastructure/browser/site_profiles/mycompany_adapter.py

from .base_adapter import BaseSiteAdapter

class MyCompanyAdapter(BaseSiteAdapter):
    def detect(self):
        return 'mycompany.com' in self.browser.page.url
    
    def get_custom_selectors(self):
        return {
            'first_name': '#applicant_fname',
            'email': '#applicant_email'
        }
```

### Batch Processing

Process multiple applications:

```python
from app.application.services.form_autofill_service import FormAutofillService

service = FormAutofillService()
urls = [url1, url2, url3]

for url in urls:
    result = service.autofill_application(resume, url, headless=True)
    print(f"Filled {result.fields_filled} fields at {url}")
```

### Screenshot Analysis

Screenshots are saved as `autofill_YYYYMMDD_HHMMSS.png`:

```bash
# View screenshots
ls -la autofill_*.png

# Open latest
open $(ls -t autofill_*.png | head -1)
```

## 🧪 Testing

### Test with Sample Sites

Safe testing sites (no actual application):

```
1. https://form-tester.com (generic forms)
2. Workday Demo: Search "workday demo careers"
3. Create your own test form
```

### Recommended Testing Flow

1. **First Test**: Use sample resume with test form
2. **Second Test**: Real resume, visible browser, non-critical job
3. **Production**: Real applications with review enabled

## 🆘 Support & Limitations

### Current Limitations

1. **File Uploads**: Resume PDF upload not yet automated
2. **CAPTCHAs**: Cannot bypass human verification
3. **Multi-Page Forms**: Each page must be handled separately
4. **Custom Widgets**: Some proprietary form widgets not supported
5. **Login Required**: Cannot handle authenticated forms (yet)

### Future Enhancements

- 📤 Automatic resume file upload
- 🔐 Session management for authenticated forms
- 📝 Cover letter customization per form
- 🤝 Multi-page form navigation
- 📊 Application tracking integration

## 📚 API Reference

### FormAutofillService

```python
service = FormAutofillService()

result = service.autofill_application(
    resume=Resume,           # Parsed resume object
    url=str,                # Application form URL
    headless=bool,          # Run in background (default: False)
    pause_for_review=bool,  # Pause before closing (default: True)
    take_screenshot=bool    # Save screenshot (default: True)
)

# Returns: AutofillResult
# - success: bool
# - fields_filled: int
# - fields_failed: int
# - mappings: List[FieldMapping]
# - errors: List[str]
# - screenshot_path: Optional[str]
```

### FieldMappingService

```python
mapper = FieldMappingService()

# Detect field type from element
field_type = mapper.detect_field_type(element_attrs)

# Map all form elements
mappings = mapper.map_fields(form_elements)

# Extract value from resume
value = mapper.get_resume_value(resume, 'first_name')
```

---

## 🎓 Examples

### Example 1: Basic Autofill

```python
from app.application.services.form_autofill_service import FormAutofillService
from app.application.services.resume_ingestion_service import ResumeIngestionService

# Parse resume
resume_service = ResumeIngestionService()
resume = resume_service.ingest_file('my_resume.pdf')

# Autofill form
autofill_service = FormAutofillService()
result = autofill_service.autofill_application(
    resume=resume,
    url='https://company.greenhouse.io/job/123',
    headless=False,
    pause_for_review=True
)

print(f"Filled {result.fields_filled} fields")
```

### Example 2: Batch Processing

```python
job_urls = [
    'https://company1.workdayjobs.com/job1',
    'https://company2.greenhouse.io/job2',
    'https://company3.lever.co/job3'
]

for url in job_urls:
    print(f"Processing: {url}")
    result = autofill_service.autofill_application(
        resume=resume,
        url=url,
        headless=True,
        pause_for_review=False
    )
    
    if result.success:
        print(f"  ✓ Success: {result.fields_filled} fields")
    else:
        print(f"  ✗ Failed: {result.errors}")
```

---

**Made with ❤️ for job seekers everywhere**

*Automate the boring stuff, focus on the jobs that matter!* 🚀
```