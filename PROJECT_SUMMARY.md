# Chrome Extension - Resume Auto-Fill Assistant

## 🎯 Project Overview

A Chrome extension that provides:
- **Side Panel UI** on the left side of the screen
- **Resume Upload** capability (PDF, DOCX)
- **Automated Cursor Control** with circular movement pattern
- **Keyboard Toggle** using Right Arrow key (→)

---

## 📁 Project Structure

```
MGMT590-GroupProject/
│
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Background service worker
├── content.js                 # Content script for cursor control
│
├── sidepanel.html             # Side panel UI (HTML/CSS)
├── sidepanel.js               # Side panel functionality
│
├── icon16.svg                 # Extension icon (16x16)
├── icon48.svg                 # Extension icon (48x48)
├── icon128.svg                # Extension icon (128x128)
│
├── generate-icons.html        # Icon generator tool
│
├── README.md                  # Detailed documentation
├── SETUP.md                   # Quick setup guide
├── PROMPTS.md                 # Project prompts log
└── PROJECT_SUMMARY.md         # This file
```

---

## ✨ Features Implemented

### 1. Side Panel UI ✅
- Modern gradient design (purple theme)
- Positioned on left side of browser
- Responsive and visually appealing
- Real-time status updates

### 2. Resume Upload ✅
- Supports PDF and DOCX formats
- Drag-and-drop functionality
- Click-to-upload option
- File information display
- Persistent storage using Chrome Storage API
- Clear/remove file capability

### 3. Cursor Control ✅
- Circular movement pattern
- 100px radius from viewport center
- Smooth animation using requestAnimationFrame
- Visual cursor indicator (purple gradient dot)
- Mouse event dispatching

### 4. Keyboard Toggle ✅
- Ctrl+Shift+Z activates/deactivates
- Works on any webpage
- Status synced with side panel
- Console logging for debugging

---

## 🔧 Technical Implementation

### Manifest V3 Configuration
- Modern Chrome extension format
- Required permissions: `activeTab`, `storage`, `sidePanel`, `<all_urls>`
- Content script injection on all URLs
- Background service worker

### Cursor Movement Algorithm
```javascript
// Circular motion using trigonometry
x = centerX + radius * Math.cos(angle)
y = centerY + radius * Math.sin(angle)
angle += speed
```

### Storage System
- Chrome Local Storage API
- Stores resume as base64-encoded data URL
- Includes metadata: filename, type, upload timestamp

### Communication Flow
```
Content Script ←→ Background Worker ←→ Side Panel
       ↓
   Keyboard Events → Toggle Cursor → Update Status
```

---

## 🚀 Installation Guide

### Prerequisites
- Google Chrome browser
- Developer mode enabled

### Steps
1. **Generate Icons** (optional but recommended)
   - Open `generate-icons.html` in browser
   - Download PNG files automatically

2. **Load Extension**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select project folder

3. **Start Using**
   - Click extension icon
   - Upload resume
   - Press Right Arrow key on any webpage

---

## 🎮 Usage Instructions

### Upload Resume
1. Open side panel
2. Click upload area or drag file
3. Select PDF or DOCX file
4. File is saved automatically

### Control Cursor
1. Navigate to any webpage
2. Press **Right Arrow (→)** key
3. Cursor moves in circular pattern
4. Press **Right Arrow (→)** again to stop
5. Status updates in side panel

---

## 🎨 Design Highlights

### Color Scheme
- Primary gradient: `#667eea` → `#764ba2` (purple)
- Success: Green tones
- Warning: Orange tones
- Error: Red tones

### UI Components
- Modern card-based layout
- Smooth transitions and hover effects
- Icon-based visual indicators
- Responsive status badges

### User Experience
- Intuitive drag-and-drop
- Clear visual feedback
- Real-time status updates
- Keyboard shortcut for power users

---

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
- Verify Developer mode is enabled
- Check all files are present
- Look for errors in `chrome://extensions/`

**Cursor not moving:**
- Ensure you're on a regular webpage (not chrome:// pages)
- Check browser console (F12) for errors
- Verify content script is loaded

**Side panel not opening:**
- Click extension icon in toolbar
- Refresh extension if needed
- Check manifest.json permissions

---

## 📊 Code Statistics

| File | Lines | Purpose |
|------|-------|---------|
| content.js | ~150 | Cursor control logic |
| sidepanel.html | ~180 | UI layout and styling |
| sidepanel.js | ~100 | File upload and status |
| background.js | ~20 | Message forwarding |
| manifest.json | ~35 | Extension configuration |

**Total: ~485 lines of functional code**

---

## 🔮 Future Enhancement Ideas

- Parse resume data (extract name, email, skills)
- Auto-fill job application forms
- Multiple cursor movement patterns (linear, random, custom paths)
- Customizable keyboard shortcuts
- Speed and radius controls
- Form field detection and highlighting
- Resume template builder
- Export/import settings
- Analytics dashboard

---

## 🎓 Educational Value

This project demonstrates:
- Chrome Extension Manifest V3 architecture
- Side Panel API usage
- Content script injection
- Browser storage management
- File upload and processing
- Keyboard event handling
- DOM manipulation
- Animation loops with requestAnimationFrame
- Inter-component communication
- Modern UI/UX design principles

---

## 📝 Project Requirements Met

✅ Chrome extension using HTML and JSON  
✅ UI on the left side of screen (side panel)  
✅ Resume upload capability (PDF, DOCX)  
✅ Mouse cursor control on webpage  
✅ Keyboard toggle (Ctrl+Shift+Z)  
✅ Circular cursor movement  
✅ README with execution instructions  
✅ PROMPTS.md with timestamped entries  

---

## 🏆 Accomplishments

- **Fully functional Chrome extension** built from scratch
- **Modern UI design** with gradient styling and animations
- **Complete file upload system** with drag-and-drop
- **Smooth cursor control** using canvas and animation frames
- **Comprehensive documentation** with multiple guides
- **Clean code structure** following best practices
- **No external dependencies** - pure HTML, CSS, JavaScript

---

## 📅 Project Information

**Created:** March 13, 2026  
**Version:** 1.0.0  
**Course:** MGMT590 Group Project  
**Technology Stack:** HTML, CSS, JavaScript, Chrome Extension API  
**Development Time:** Single session implementation  
**Files Created:** 12 core files  

---

## 🤝 How to Contribute

Future developers can:
1. Add resume parsing functionality
2. Implement auto-fill logic
3. Create additional movement patterns
4. Add settings/preferences page
5. Improve icon designs
6. Add unit tests
7. Create demo video/screenshots

---

## 📜 License

Educational project for MGMT590 coursework.

---

**Status: ✅ Complete and Ready to Use**

For setup instructions, see `SETUP.md`  
For detailed documentation, see `README.md`  
For prompt history, see `PROMPTS.md`

