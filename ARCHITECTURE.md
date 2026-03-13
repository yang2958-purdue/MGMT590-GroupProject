# Chrome Extension Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                            │
│                                                                   │
│  ┌─────────────────┐                    ┌──────────────────┐    │
│  │  Extension Icon │────Click──────────>│   Side Panel     │    │
│  │   (Toolbar)     │                    │  (sidepanel.html)│    │
│  └─────────────────┘                    │                  │    │
│                                          │  ┌────────────┐  │    │
│                                          │  │ File Upload│  │    │
│                                          │  │   Area     │  │    │
│                                          │  └────────────┘  │    │
│  ┌─────────────────────────────┐        │                  │    │
│  │      Background Worker      │        │  ┌────────────┐  │    │
│  │     (background.js)         │<───────│  │   Status   │  │    │
│  │                             │ Updates│  │  Display   │  │    │
│  │  • Message Forwarding       │        │  └────────────┘  │    │
│  │  • Side Panel Control       │        └──────────────────┘    │
│  └──────────────┬──────────────┘                                │
│                 │                                                │
│                 │ Messages                                       │
│                 ↓                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │           Content Script (content.js)            │          │
│  │              Injected into Each Tab              │          │
│  │                                                   │          │
│  │  • Keyboard Event Listener (Right Arrow Key)     │          │
│  │  • Cursor Element Creation                       │          │
│  │  • Animation Loop (requestAnimationFrame)        │          │
│  │  • Circular Motion Calculation                   │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Chrome Storage API                  │          │
│  │         (Local Storage for Resume Files)         │          │
│  └──────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Resume Upload Flow
```
User Selects File
      ↓
sidepanel.html (UI)
      ↓
sidepanel.js (Handle File)
      ↓
FileReader API (Convert to Base64)
      ↓
Chrome Storage API (Save)
      ↓
Display Success Message
```

### 2. Cursor Control Flow
```
User Presses Ctrl+Shift+Z
      ↓
content.js (Keyboard Event Listener)
      ↓
Toggle cursorControlActive Flag
      ↓
Start/Stop Animation Loop
      ↓
requestAnimationFrame (Continuous)
      ↓
Calculate Position (x, y = centerX + radius × cos/sin(angle))
      ↓
Update Cursor Element Position
      ↓
Dispatch Mouse Events
      ↓
Send Status Update to Side Panel
```

### 3. Status Update Flow
```
content.js (Status Change)
      ↓
chrome.runtime.sendMessage()
      ↓
background.js (Forward Message)
      ↓
sidepanel.js (Receive Message)
      ↓
Update UI Display (ON/OFF Badge)
```

## Component Responsibilities

### manifest.json
```json
{
  "Purpose": "Extension Configuration",
  "Defines": [
    "Permissions",
    "Content Scripts",
    "Background Worker",
    "Side Panel",
    "Icons"
  ]
}
```

### background.js (Service Worker)
- Listens for extension icon clicks
- Opens side panel
- Forwards messages between components
- Runs in background independently

### content.js (Content Script)
- Injected into every webpage
- Listens for keyboard events
- Controls cursor animation
- Manages cursor element lifecycle
- Sends status updates

### sidepanel.html + sidepanel.js
- Displays UI on left side
- Handles file upload (click + drag-drop)
- Shows real-time status
- Manages Chrome storage operations
- Provides user feedback

## Technology Stack

```
┌─────────────────────────────────────┐
│         Chrome Extensions API       │
│                                     │
│  • Side Panel API                  │
│  • Storage API                     │
│  • Runtime Messaging               │
│  • Content Scripts API             │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│         Web Technologies            │
│                                     │
│  • HTML5                           │
│  • CSS3 (Gradients, Flexbox)      │
│  • JavaScript (ES6+)               │
│  • FileReader API                  │
│  • requestAnimationFrame           │
└─────────────────────────────────────┘
```

## Interaction Patterns

### Keyboard Interaction
```
Ctrl+Shift+Z Press
      ↓
event.ctrlKey && event.shiftKey && event.key === 'Z'
      ↓
toggleCursorControl()
      ↓
cursorControlActive = !cursorControlActive
      ↓
Start or Stop Animation
```

### File Upload Interaction
```
Method 1: Click          Method 2: Drag & Drop
     ↓                          ↓
Click Upload Area         Drag File Over Area
     ↓                          ↓
Open File Picker          Highlight Area
     ↓                          ↓
Select File               Drop File
     ↓                          ↓
        ┌───────────────────────┘
        ↓
   handleFile()
        ↓
   Read & Store
```

## Animation Loop

```javascript
function moveCursorInCircle() {
    if (!cursorControlActive) return;
    
    // Calculate position
    x = centerX + radius * cos(angle)
    y = centerY + radius * sin(angle)
    
    // Update cursor
    cursorElement.style.left = x + 'px'
    cursorElement.style.top = y + 'px'
    
    // Increment angle
    angle += speed
    
    // Continue loop
    requestAnimationFrame(moveCursorInCircle)
}
```

### Animation Parameters
- **Radius:** 100 pixels
- **Speed:** 0.05 radians per frame
- **FPS:** ~60 (browser-dependent)
- **Center:** Viewport center (updates on resize)

## Storage Schema

```javascript
{
  resumeFile: {
    name: "resume.pdf",
    type: "application/pdf",
    data: "data:application/pdf;base64,JVBERi0x...",
    uploadedAt: "2026-03-13T15:30:00.000Z"
  }
}
```

## Message Protocol

### Message Types

1. **cursorStatusUpdate**
```javascript
{
  type: 'cursorStatusUpdate',
  isActive: true/false
}
```

2. **getCursorStatus**
```javascript
// Request
{ type: 'getCursorStatus' }

// Response
{ isActive: true/false }
```

## Security Considerations

- ✅ Manifest V3 (latest security standards)
- ✅ Content Security Policy enforced
- ✅ Local storage only (no external servers)
- ✅ File size limits from browser
- ✅ No eval() or inline scripts
- ✅ Scoped permissions

## Performance Optimizations

1. **requestAnimationFrame** - Syncs with browser refresh rate
2. **Event delegation** - Minimal event listeners
3. **Conditional animation** - Only runs when active
4. **Efficient DOM updates** - Direct style manipulation
5. **Single cursor element** - Reused, not recreated

## Extension Lifecycle

```
Installation
     ↓
User Clicks Icon
     ↓
Side Panel Opens (First Time)
     ↓
Content Script Loads in Active Tab
     ↓
Background Worker Starts
     ↓
Ready for Use
     ↓
[User Interacts]
     ↓
State Persists Across Browser Restarts
```

## Browser Compatibility

- **Chrome:** ✅ Full support (Manifest V3)
- **Edge:** ✅ Compatible (Chromium-based)
- **Brave:** ✅ Should work (Chromium-based)
- **Firefox:** ❌ Requires Manifest V2 adaptation
- **Safari:** ❌ Different extension format

## File Dependencies

```
manifest.json
    ├── background.js (service worker)
    ├── content.js (all tabs)
    ├── sidepanel.html
    │   └── sidepanel.js
    └── icon*.svg (assets)
```

## Key Design Decisions

1. **Side Panel vs Popup:** Side panel chosen for persistent UI
2. **Content Script:** Needed for keyboard events and DOM access
3. **Animation:** requestAnimationFrame for smooth 60 FPS
4. **Storage:** Local storage for privacy (no server needed)
5. **Toggle Key:** Right Arrow chosen as unlikely to conflict
6. **Movement:** Circular pattern as simple, predictable demo

---

## Quick Reference

**Toggle Cursor:** Ctrl+Shift+Z  
**Open Panel:** Click extension icon  
**Upload File:** Click or drag-drop  
**Clear File:** Click "Clear Resume" button  
**Storage Location:** Chrome Local Storage  
**Animation Rate:** ~60 FPS  
**Movement Radius:** 100px  

---

For implementation details, see individual source files:
- `manifest.json` - Configuration
- `background.js` - Service worker
- `content.js` - Cursor logic
- `sidepanel.html/js` - UI components

