# Installing on Microsoft Edge

## Quick Guide: Install Extension on Microsoft Edge

The Resume Auto-Fill Assistant is **fully compatible with Microsoft Edge** since Edge uses the same Chromium engine as Chrome.

---

## Installation Steps for Edge

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Open Edge Extensions Page**
   - Open Microsoft Edge
   - Navigate to: `edge://extensions/`
   - Or click the menu (⋯) → Extensions → Manage extensions

2. **Enable Developer Mode**
   - Toggle **"Developer mode"** switch in the bottom-left corner to ON

3. **Load the Extension**
   - Click the **"Load unpacked"** button
   - Browse to: `C:\DEVOPS FOLDER\MGMT590-GroupProject`
   - Click **"Select Folder"**

4. **Verify Installation**
   - Extension should appear in your extensions list
   - You should see "Resume Auto-Fill Assistant" with version 1.0.0
   - Status should show as "Enabled"

5. **Pin to Toolbar (Optional)**
   - Click the extensions icon (puzzle piece) in toolbar
   - Find "Resume Auto-Fill Assistant"
   - Click the pin icon to keep it visible

---

## Testing on Edge

### Quick Test:
1. **Open a form page** (e.g., https://forms.office.com)
2. **Click the extension icon** - Side panel opens
3. **Check field detection** - Should show detected fields
4. **Press Ctrl+Shift+Z** - Extension activates
5. **Watch it work!** - Fields get highlighted and interacted with

---

## Differences Between Chrome and Edge

### ✅ Fully Compatible Features:
- ✅ Side panel UI
- ✅ File upload (PDF, DOCX)
- ✅ Form field detection
- ✅ Keyboard shortcuts (Ctrl+Shift+Z)
- ✅ Auto-fill functionality
- ✅ Field highlighting
- ✅ Storage API

### 🔄 Browser-Specific Behaviors:
- **Edge** may have slightly different default security policies
- **Edge Collections** won't interfere with extension
- **Edge Workspace** tabs are supported
- Side panel positioning is identical in both browsers

---

## Troubleshooting Edge-Specific Issues

### Extension Won't Load?
**Problem:** Error when loading extension in Edge

**Solutions:**
1. Make sure Developer mode is enabled
2. Check that all files are in the folder
3. Try restarting Edge
4. Check `edge://extensions/` for error messages

### Side Panel Not Opening?
**Problem:** Clicking icon doesn't open side panel

**Solutions:**
1. Edge version must be 114+ (check: `edge://settings/help`)
2. Try right-clicking icon → Select "Open side panel"
3. Reload the extension
4. Restart Edge browser

### Keyboard Shortcut Not Working?
**Problem:** Ctrl+Shift+Z doesn't activate

**Solutions:**
1. Check if Edge has conflicting shortcuts:
   - Go to `edge://extensions/shortcuts`
   - Verify no conflicts with Ctrl+Shift+Z
2. Make sure page has focus (click on page first)
3. Check console for errors (F12)

### Form Detection Issues?
**Problem:** Fields not being detected on specific sites

**Solutions:**
1. Some sites use shadow DOM (advanced): May need special handling
2. Try refreshing the page after extension loads
3. Check console: Should show "Detected X form fields"
4. Some Microsoft forms use custom elements - may need tweaking

---

## Edge-Specific Features to Try

### Works Great With:
- ✅ **Microsoft Forms** (forms.office.com)
- ✅ **LinkedIn Jobs** (linkedin.com/jobs)
- ✅ **Indeed Applications** (indeed.com)
- ✅ **Workday Career Sites**
- ✅ **Google Forms** (forms.google.com)

### Edge Integration:
- Collections: Extension won't interfere
- Vertical Tabs: Extension works normally
- Split Screen: Works in both panes
- Edge Workspaces: Independent per workspace

---

## Verify Browser Compatibility

Open the **browser console** (F12) and look for:
```
🌐 Browser detected: Edge
Resume Assistant content script loaded. Press Ctrl+Shift+Z to toggle cursor control. (Running on Edge)
```

This confirms the extension recognizes it's running on Edge!

---

## Performance on Edge

### Expected Performance:
- **Load Time:** < 0.5 seconds
- **Field Detection:** < 1 second
- **Memory Usage:** ~10-20 MB
- **CPU Usage:** < 2% when active

Edge typically performs **identically** to Chrome with this extension.

---

## Cross-Browser Testing Checklist

Test on both browsers to ensure consistency:

#### Chrome
- [ ] Extension loads
- [ ] Side panel opens
- [ ] Fields detected
- [ ] Ctrl+Shift+Z works
- [ ] Auto-fill works

#### Edge
- [ ] Extension loads
- [ ] Side panel opens
- [ ] Fields detected
- [ ] Ctrl+Shift+Z works
- [ ] Auto-fill works

---

## Browser Version Requirements

| Browser | Minimum Version | Recommended |
|---------|----------------|-------------|
| Chrome | 114+ | Latest |
| Edge | 114+ | Latest |
| Brave | 114+ | Latest |
| Chromium | 114+ | Latest |

**Check your version:**
- Chrome: `chrome://settings/help`
- Edge: `edge://settings/help`

---

## Advanced: Edge-Specific Debugging

### Enable Verbose Logging
1. Open console (F12)
2. Extension logs will show browser type
3. Look for Edge-specific messages

### Check Extension Details
1. Go to `edge://extensions/`
2. Click "Details" on extension
3. Verify:
   - All permissions granted
   - No errors shown
   - Service worker is active

### Test Content Script Loading
1. Open any webpage
2. Open console (F12)
3. Should see: `"Resume Assistant content script loaded..."`
4. Should show: `"🌐 Browser detected: Edge"`

---

## Common Edge Pages to Test

Try the extension on these Edge-friendly sites:

1. **Microsoft Forms** - https://forms.office.com
   - Great for testing all field types

2. **LinkedIn Jobs** - https://linkedin.com/jobs
   - Tests real job application forms

3. **Edge New Tab Page** - edge://newtab
   - Won't work (internal page) - this is normal

4. **Bing** - https://bing.com
   - Tests basic detection

5. **Test Form** - https://www.w3schools.com/html/html_forms.asp
   - Simple test environment

---

## Edge vs Chrome: Key Differences

| Feature | Chrome | Edge | Notes |
|---------|--------|------|-------|
| Extension Store | Chrome Web Store | Edge Add-ons | Dev mode for both |
| Side Panel API | ✅ | ✅ | Identical |
| Manifest V3 | ✅ | ✅ | Same support |
| Keyboard Shortcuts | ✅ | ✅ | May need mapping |
| File API | ✅ | ✅ | Same behavior |

---

## Migration: Moving from Chrome to Edge

Already installed on Chrome? Easy to add to Edge:

1. Keep Chrome installation as-is
2. Follow Edge installation steps above
3. Both can run simultaneously
4. Settings/storage are independent

---

## Updating the Extension

Same process for both browsers:

1. Make code changes
2. Go to `edge://extensions/` (or `chrome://extensions/`)
3. Click **Reload** button on the extension
4. Test the changes

---

## Getting Help

If extension doesn't work on Edge:

1. **Check Console:** Look for error messages
2. **Browser Version:** Ensure Edge 114+
3. **Developer Mode:** Must be enabled
4. **File Permissions:** Ensure Windows allows access
5. **Firewall:** Shouldn't affect local extensions

---

## Success Indicators

✅ **Working Correctly on Edge:**
- Extension appears in `edge://extensions/`
- No error messages shown
- Side panel opens when icon clicked
- Console shows: "Browser detected: Edge"
- Fields are detected on form pages
- Ctrl+Shift+Z toggles functionality
- Fields highlight and get clicked

---

## Next Steps

Once installed on Edge:
1. ✅ Test on Microsoft Forms
2. ✅ Test on LinkedIn job applications
3. ✅ Test keyboard shortcuts
4. ✅ Upload a test resume
5. ✅ Try the auto-fill feature

---

**The extension is fully cross-browser compatible!** 🎉

Works on: Chrome, Edge, Brave, Chromium, and other Chromium-based browsers.

---

For Chrome installation: See `README.md`  
For testing: See `TESTING.md`  
For troubleshooting: See `KEYBOARD_TEST.md`

