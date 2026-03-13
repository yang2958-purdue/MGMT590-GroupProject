# Resume Auto-Fill Assistant - Chrome Extension

> **📚 New here?** See [`INDEX.md`](INDEX.md) for a complete documentation guide  
> **🚀 Quick Start?** Jump to [`QUICKSTART.md`](QUICKSTART.md) for 3-minute setup

A Chrome extension that allows you to upload resumes and control your cursor on web pages with circular movement patterns.

## Features

- 📄 **Resume Upload**: Upload PDF or DOCX resume files via drag-and-drop or file selection
- 🎯 **Cursor Control**: Automated cursor movement in circular patterns on web pages
- ⌨️ **Keyboard Toggle**: Press the Right Arrow key (→) to toggle cursor control on/off
- 🎨 **Modern UI**: Beautiful side panel interface with real-time status updates

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

### Upload a Resume

1. Open the side panel by clicking the extension icon
2. In the "Upload Resume" section:
   - **Option A**: Click the upload area and select a PDF or DOCX file
   - **Option B**: Drag and drop a resume file directly onto the upload area
3. Your resume will be saved locally in Chrome storage
4. Click "Clear Resume" to remove the uploaded file

### Control the Cursor

1. Navigate to any web page where you want to control the cursor
2. Press the **Right Arrow key (→)** on your keyboard to activate cursor control
3. The cursor will automatically move in a circular pattern on the page
4. Press the **Right Arrow key (→)** again to deactivate cursor control
5. The side panel shows the current status (ON/OFF) in real-time

## Technical Details

### Files Structure

```
MGMT590-GroupProject/
├── manifest.json          # Chrome extension configuration
├── sidepanel.html         # Side panel UI
├── sidepanel.js           # Side panel functionality
├── content.js             # Cursor control logic
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
- Ensure you're pressing the Right Arrow key (→)
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

