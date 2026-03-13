# Resume Parsing & Auto-Fill Guide

This guide explains how the Resume Auto-Fill Assistant parses resumes and intelligently fills form fields.

## How Resume Parsing Works

When you upload a resume (PDF, DOCX, or TXT), the extension extracts the following information:

### Personal Information
- **Full Name**: Extracted from the first non-empty line (usually the header)
- **First Name**: First word of the name
- **Last Name**: Last word of the name
- **Email**: Pattern matching for email addresses (e.g., john.doe@email.com)
- **Phone**: Pattern matching for phone numbers (e.g., (555) 123-4567, 555-123-4567, +1-555-123-4567)

### Additional Data (Future Enhancement)
- Address components (City, State, ZIP code)
- Education history
- Work experience
- Skills

## Smart Field Mapping

The extension uses intelligent field mapping to match your resume data with form fields. It analyzes field labels and identifies the appropriate data to fill.

### Field Label Matching

| Form Field Label | Resume Data Used | Examples |
|-----------------|------------------|----------|
| "First Name", "First", "Given Name" | First Name | John |
| "Last Name", "Last", "Surname", "Family Name" | Last Name | Smith |
| "Full Name", "Name", "Your Name" | Full Name | John Smith |
| "Email", "E-mail", "Email Address" | Email | john.smith@email.com |
| "Phone", "Telephone", "Mobile", "Cell" | Phone | (555) 123-4567 |
| "City", "Town" | City | San Francisco |
| "State", "Province" | State | CA |
| "ZIP", "Postal Code", "ZIP Code" | ZIP Code | 94102 |

### Case-Insensitive Matching
The extension performs case-insensitive matching, so it will work with:
- "FIRST NAME"
- "first name"
- "First Name"
- "firstName"
- "firstname"

## Testing the Feature

### Step 1: Prepare a Test Resume

Use the included `sample-resume.txt` file or create your own resume file with the following format:

```
Your Full Name

your.email@example.com
(555) 123-4567
123 Main St, City, State 12345

PROFESSIONAL SUMMARY
...

EDUCATION
...

EXPERIENCE
...

SKILLS
...
```

### Step 2: Upload the Resume

1. Open the extension side panel
2. Upload your resume file (TXT, PDF, or DOCX)
3. Verify the extracted data appears in the side panel:
   - Name should be displayed
   - Email should be displayed
   - Phone should be displayed

### Step 3: Test on a Form Page

**Recommended Test Sites:**
- https://www.w3schools.com/html/html_forms.asp (Simple test form)
- https://form-filler-test.netlify.app/ (Form testing site)
- Any job application form

**Testing Steps:**
1. Navigate to a page with a form
2. The extension automatically scans for fields
3. Check the side panel - it should show the number of detected fields
4. Press **Ctrl+Shift+Z** to activate auto-fill
5. Watch as the extension:
   - Moves through each field
   - Fills text fields with your resume data
   - Highlights fields (blue = focused, green = filled)
6. Verify that:
   - Name fields are filled correctly
   - Email field is filled correctly
   - Phone field is filled correctly

### Step 4: Verify Field Mapping

Create a test HTML file to verify field mapping:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Resume Auto-Fill Test</title>
</head>
<body>
    <h1>Test Form</h1>
    <form>
        <label for="fname">First Name:</label>
        <input type="text" id="fname" name="firstname"><br><br>
        
        <label for="lname">Last Name:</label>
        <input type="text" id="lname" name="lastname"><br><br>
        
        <label for="email">Email:</label>
        <input type="email" id="email" name="email"><br><br>
        
        <label for="phone">Phone:</label>
        <input type="tel" id="phone" name="phone"><br><br>
        
        <label for="fullname">Full Name:</label>
        <input type="text" id="fullname" name="fullname"><br><br>
    </form>
</body>
</html>
```

## Supported File Formats

### Text Files (.txt)
- ✅ Fully supported
- Direct text extraction
- Best for testing

### PDF Files (.pdf)
- ✅ Basic support
- Works with text-based PDFs
- May have limitations with scanned/image PDFs
- For production use, consider using PDF.js library

### Word Documents (.docx)
- ✅ Basic support
- Simple text extraction
- For production use, consider using mammoth.js library

## Troubleshooting

### Resume Data Not Appearing
1. Check the browser console for errors
2. Verify the resume file format is supported
3. Ensure the resume has a clear structure (name at top, email, phone visible)

### Fields Not Auto-Filling
1. Verify resume data was extracted (check side panel)
2. Ensure field labels match expected patterns
3. Check browser console for field detection messages
4. Try refreshing the page and re-activating the extension

### Incorrect Data in Fields
1. Review the field label matching rules
2. Adjust resume format for better parsing
3. Check that field labels clearly indicate what data is expected

## Advanced: Extending Field Mapping

To add support for new field types, edit `content.js`:

```javascript
function getResumeValueForField(field) {
    // Add your custom field matching logic here
    const label = field.label.toLowerCase();
    
    // Example: Add LinkedIn URL support
    if (label.includes('linkedin')) {
        return resumeData.personal.linkedin;
    }
    
    // ... existing mapping logic
}
```

## Privacy & Security

- All resume data is stored **locally** in your browser (chrome.storage.local)
- No data is sent to external servers
- Data persists across browser sessions until you click "Clear Resume"
- Data is only accessible by this extension on your local machine

## Future Enhancements

Planned improvements:
- Support for more resume formats
- Advanced parsing for education and experience sections
- Machine learning-based field detection
- Support for custom field mappings
- Multi-language support
- Resume template detection

