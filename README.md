# Resume Auto-Fill Assistant - Chrome Extension

> **📚 New here?** See [`INDEX.md`](INDEX.md) for a complete documentation guide  
> **🚀 Quick Start?** Jump to [`QUICKSTART.md`](QUICKSTART.md) for 3-minute setup  
> **🌐 Using Edge?** See [`EDGE_INSTALLATION.md`](EDGE_INSTALLATION.md) for Microsoft Edge setup

A Chrome extension that intelligently parses your resume and automatically fills out online forms with your information.

**✅ Works on:** Chrome, Microsoft Edge, Brave, and all Chromium-based browsers!

## Features

- 📄 **Resume Upload & Parsing**: Upload PDF or DOCX resume files - automatically extracts name, email, phone, and more
- 🤖 **Intelligent Auto-Fill**: Automatically fills form fields with appropriate resume data based on field labels
- 🔍 **Form Detection**: Detects all form fields on a page including text inputs, dropdowns, checkboxes, and radio buttons
- ⌨️ **Keyboard Toggle**: Press Ctrl+Shift+Z to activate auto-fill mode
- 📊 **Field Counter**: Shows the number of detected form fields and auto-fill status
- 🎨 **Modern UI**: Beautiful side panel interface with real-time status updates and parsed data display

## Installation Instructions

### Step 1: Generate Icon Files (Optional but Recommended)

The project includes SVG icons, but Chrome works best with PNG format:

**Option A - Browser Method (Easiest):**
1. Open `generate-icons.html` in your web browser
2. Three PNG files will automatically download
3. Save them in the project directory

**Option B - Use SVG files:**
- SVG icons are already included (`icon16.svg`, `icon48.svg`, `icon128.svg`)
- Chrome may show warnings but will still work
- To use SVG, no action needed - they're already referenced in `manifest.json`

### Step 2: Verify Files

Make sure you have all the following files in your project directory:
- `manifest.json`
- `sidepanel.html`
- `sidepanel.js`
- `content.js`
- `background.js`
- `icon16.svg/png`, `icon48.svg/png`, `icon128.svg/png` (icons)

### Step 3: Load Extension in Chrome

1. Open Google Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** by toggling the switch in the top-right corner
4. Click the **Load unpacked** button
5. Select the project directory folder: `C:\DEVOPS FOLDER\MGMT590-GroupProject`
6. The extension should now appear in your extensions list

### Step 4: Open the Side Panel

1. Click on the extension icon in your Chrome toolbar
2. The side panel will open on the left side of your screen
3. You're now ready to use the extension!

## How to Use

### Step 1: Upload Your Resume

1. Open the side panel by clicking the extension icon
2. In the "Upload Resume" section:
   - **Option A**: Click the upload area and select a PDF or DOCX file
   - **Option B**: Drag and drop a resume file directly onto the upload area
3. The extension will automatically parse your resume and extract key information:
   - Full name, first name, last name
   - Email address
   - Phone number
   - Additional data (address, education, skills)
4. Extracted data will be displayed in the side panel
5. Click "Clear Resume" to remove the uploaded file

### Step 2: Auto-Fill Online Forms

1. Navigate to any web page with a form (job applications, surveys, etc.)
2. The extension automatically scans and detects all form fields
3. The side panel displays:
   - **Total fields detected** on the page
   - Breakdown by field type (text, dropdown, checkbox, radio)
   - Number of fields already filled
4. Press **Ctrl+Shift+Z** to activate auto-fill mode
5. The extension will:
   - Move through each form field sequentially
   - Automatically fill text fields with matching resume data
   - Highlight fields as they are processed (blue = focused, green = auto-filled)
   - Interact with dropdowns, checkboxes, and radio buttons
6. Press **Ctrl+Shift+Z** again to deactivate auto-fill mode

### Smart Field Mapping

The extension intelligently maps your resume data to form fields based on field labels:

- **"First Name"** → Your first name from resume
- **"Last Name"** → Your last name from resume  
- **"Email"** → Your email address from resume
- **"Phone"** / **"Mobile"** → Your phone number from resume
- **"Name"** → Your full name from resume
- And more...

## Technical Details

### Files Structure

```
MGMT590-GroupProject/
├── manifest.json          # Chrome extension configuration
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel functionality & resume parsing
├── content.js             # Form detection & auto-fill logic
├── resume-parser.js       # Resume data extraction module
├── background.js          # Background service worker
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
├── README.md             # This file
└── PROMPTS.md            # Project prompts log
```

### Permissions

The extension requires the following permissions:
- `activeTab`: To interact with the current tab
- `storage`: To save uploaded resume files
- `sidePanel`: To display the side panel UI
- `<all_urls>`: To run cursor control on all web pages

### Cursor Movement Pattern

- **Movement Type**: Circular
- **Radius**: 100 pixels from center
- **Speed**: Adjustable rotation speed
- **Center Point**: Middle of the viewport

## Troubleshooting

### Extension Not Loading
- Make sure Developer mode is enabled in `chrome://extensions/`
- Verify all required files are in the project directory
- Check the Chrome console for any error messages

### Cursor Control Not Working
- Ensure you're pressing Ctrl+Shift+Z (all three keys together)
- Check that the content script is loaded (look for console message)
- Refresh the web page and try again

### Side Panel Not Opening
- Click the extension icon in the toolbar
- Make sure the extension is enabled in `chrome://extensions/`
- Try reloading the extension

## Development

This extension uses:
- **Manifest V3**: Latest Chrome extension format
- **HTML/CSS/JavaScript**: No external frameworks required
- **Chrome Storage API**: For resume file persistence
- **Chrome Side Panel API**: For the UI interface

## Future Enhancements

Potential features to add:
- Parse resume data (name, email, skills, etc.)
- Auto-fill form fields on job application pages
- Multiple movement patterns (linear, random, etc.)
- Customizable keyboard shortcuts
- Export/import resume data

## License

This project is for educational purposes as part of MGMT590 Group Project.

---

**Created**: March 13, 2026
**Version**: 1.0.0

