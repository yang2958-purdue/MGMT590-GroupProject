# Project Prompts Log

## 2026-03-13 - Chrome Extension with Resume Upload and Cursor Control

**Timestamp:** Friday, March 13, 2026

**Prompt:**
Create a basic chrome extension using HTML and JSON that:
- Creates a UI on the left side of the screen
- Allows uploading a resume (PDF, DOCX)
- Has the ability to control mouse cursor on a webpage
- Has a keyboard toggle using the right arrow key for on/off
- For now, cursor should move in a circle when active

---

## 2026-03-13 - Change Keyboard Toggle

**Timestamp:** Friday, March 13, 2026

**Prompt:**
Change the cursor toggle button from Right Arrow key to Ctrl+Shift+Z

---

## 2026-03-13 - Form Field Detection and Auto-Fill

**Timestamp:** Friday, March 13, 2026

**Prompt:**
Implement form field detection and interaction features:
- Search for places to click (dropdown menus, multiple choice questions, text input areas)
- Auto-click and interact with detected form fields
- Add a counter on the side panel showing the number of identified questions/fields on the form page
- Move through fields sequentially instead of circular cursor movement
- Highlight fields as they are selected

---

## 2026-03-13 - Resume Parsing and Intelligent Auto-Fill

**Timestamp:** Friday, March 13, 2026

**Prompt:**
Parse the data from uploaded resumes and intelligently fill form fields:
- Extract key information from resume: name (first, last), email, phone, address, education, etc.
- Map extracted data to form fields based on field labels
- Automatically fill fields with appropriate resume data when Ctrl+Shift+Z is activated
- Display extracted resume data in the side panel
- Store parsed data in chrome.storage for persistence across pages

