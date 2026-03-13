# Testing Guide

## Pre-Installation Testing

### ✅ File Verification
Run this checklist before loading the extension:

- [ ] `manifest.json` exists
- [ ] `background.js` exists
- [ ] `content.js` exists
- [ ] `sidepanel.html` exists
- [ ] `sidepanel.js` exists
- [ ] At least one set of icons exists (SVG or PNG)

## Installation Testing

### Step 1: Load Extension
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select project folder
5. **Expected Result:** Extension appears in list with no errors

### Step 2: Verify Extension Icon
1. Look for extension icon in Chrome toolbar
2. **Expected Result:** Icon visible (may be in extensions menu)

## Functionality Testing

### Test 1: Side Panel Opens
1. Click extension icon in toolbar
2. **Expected Result:** Side panel opens on left side
3. **Verify:** 
   - Title: "📄 Resume Assistant"
   - Upload area visible
   - Status section shows "Cursor Control: OFF"
   - Info box about Right Arrow key visible

### Test 2: Resume Upload (Click Method)
1. Open side panel
2. Click the upload area
3. Select a PDF or DOCX file
4. **Expected Result:**
   - File name appears in green box below upload area
   - "Clear Resume" button becomes enabled
   - No error messages

### Test 3: Resume Upload (Drag & Drop)
1. Open side panel
2. Drag a PDF or DOCX file over upload area
3. **Expected Result:** Upload area changes appearance (darker background)
4. Drop the file
5. **Expected Result:**
   - File name appears
   - "Clear Resume" button enabled

### Test 4: Clear Resume
1. Upload a resume (using Test 2 or 3)
2. Click "Clear Resume" button
3. **Expected Result:**
   - File info box disappears
   - "Clear Resume" button becomes disabled
   - Upload area returns to default state

### Test 5: Cursor Control Activation
1. Navigate to any regular webpage (e.g., www.google.com)
2. Press the **Right Arrow (→)** key on keyboard
3. **Expected Result:**
   - A purple circular cursor appears
   - Cursor starts moving in a circle
   - Console shows: "Cursor control activated"

### Test 6: Side Panel Status Update
1. Activate cursor control (press Right Arrow)
2. Look at side panel
3. **Expected Result:**
   - "Cursor Control:" status changes from "OFF" (red) to "ON" (green)

### Test 7: Cursor Control Deactivation
1. With cursor control active
2. Press **Right Arrow (→)** key again
3. **Expected Result:**
   - Purple cursor disappears
   - Movement stops
   - Side panel status changes to "OFF"
   - Console shows: "Cursor control deactivated"

### Test 8: Cursor Movement Pattern
1. Activate cursor control
2. Observe the movement
3. **Expected Result:**
   - Cursor moves in a perfect circle
   - Circle is centered in viewport
   - Movement is smooth and continuous
   - No jerky or erratic behavior

### Test 9: Resume Persistence
1. Upload a resume
2. Close side panel
3. Close Chrome completely
4. Reopen Chrome
5. Click extension icon to open side panel
6. **Expected Result:**
   - Previously uploaded resume still shows
   - File name is displayed
   - "Clear Resume" button is enabled

### Test 10: Multi-Tab Testing
1. Open multiple Chrome tabs
2. Activate cursor control in Tab 1
3. Switch to Tab 2
4. Press Right Arrow in Tab 2
5. **Expected Result:**
   - Each tab has independent cursor control
   - Tab 1 cursor stays active
   - Tab 2 cursor activates separately

## Browser Console Testing

### Check Console Messages
1. Open Developer Tools (F12)
2. Go to Console tab
3. **Expected Messages:**
   - "Resume Assistant content script loaded..."
   - "Resume Assistant background service worker loaded"
   - When toggling: "Cursor control activated/deactivated"

### Check for Errors
1. Monitor console for red error messages
2. **Expected Result:** No errors under normal operation

## Edge Cases Testing

### Test 11: Invalid File Type
1. Try to upload a .txt or .jpg file
2. **Expected Result:** Browser file picker should prevent selection (only PDF/DOCX allowed)

### Test 12: Very Large File
1. Upload a large PDF (10+ MB)
2. **Expected Result:** 
   - Should still work
   - May take longer to process
   - No crashes or freezes

### Test 13: Cursor Control on Chrome Pages
1. Navigate to `chrome://extensions/`
2. Try to activate cursor control
3. **Expected Result:**
   - May not work on chrome:// pages (this is normal)
   - No errors or crashes
   - Works again on regular webpages

### Test 14: Window Resize
1. Activate cursor control
2. Resize browser window
3. **Expected Result:**
   - Circle remains centered in viewport
   - Movement continues smoothly
   - No positioning errors

### Test 15: Side Panel While Cursor Active
1. Activate cursor control
2. Open side panel
3. **Expected Result:**
   - Status shows "ON"
   - Cursor continues moving
   - No conflicts between panel and cursor

## Performance Testing

### Test 16: CPU/Memory Usage
1. Activate cursor control
2. Open Chrome Task Manager (Shift+Esc)
3. **Expected Result:**
   - Reasonable CPU usage (< 5%)
   - No memory leaks
   - Smooth animation at 60 FPS

### Test 17: Long Duration Test
1. Activate cursor control
2. Leave running for 5+ minutes
3. **Expected Result:**
   - Continues working smoothly
   - No slowdown
   - No browser hang

## Known Limitations

✅ **Working:**
- All standard webpages
- File upload (PDF, DOCX)
- Circular cursor movement
- Keyboard toggle
- Status synchronization

⚠️ **Limitations:**
- May not work on chrome:// internal pages
- SVG icons may show warnings (use PNG for production)
- Cursor control doesn't physically move mouse (simulates events)
- Resume parsing not yet implemented (future feature)

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Smooth cursor animation
- ✅ Responsive UI
- ✅ Persistent storage working
- ✅ Keyboard toggle functioning
- ✅ Side panel displays correctly

## Bug Reporting Template

If you find issues, document them as:

```
**Issue:** [Brief description]
**Steps to Reproduce:**
1. Step 1
2. Step 2
**Expected Behavior:** [What should happen]
**Actual Behavior:** [What actually happens]
**Console Errors:** [Any error messages]
**Browser Version:** [Chrome version]
```

---

## Quick Test Checklist

- [ ] Extension loads without errors
- [ ] Side panel opens
- [ ] Resume upload works (both methods)
- [ ] Clear resume works
- [ ] Right Arrow key toggles cursor
- [ ] Cursor moves in circle
- [ ] Side panel status updates
- [ ] Resume persists after reload
- [ ] No console errors
- [ ] Smooth performance

**All tests passing? 🎉 Extension is working perfectly!**

---

For issues, refer to:
- `README.md` - Detailed documentation
- `SETUP.md` - Setup instructions
- `PROJECT_SUMMARY.md` - Technical overview

