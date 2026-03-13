# 🧪 Keyboard Input Test Guide

## Quick Test to Verify Key Capture

Follow these steps to ensure the extension is properly capturing your keyboard inputs:

---

## Step 1: Load/Reload Extension

1. Go to `chrome://extensions/`
2. Find "Resume Auto-Fill Assistant"
3. Click the **Reload** button (🔄) to ensure latest changes are loaded
4. Verify extension shows "Enabled"

---

## Step 2: Open Side Panel

1. Click the extension icon in Chrome toolbar
2. Side panel should open on the left side
3. Look for the **"Last Key Press:"** field in the status section

---

## Step 3: Navigate to Test Page

1. Open a new tab
2. Navigate to any regular website (e.g., `www.google.com`)
3. Click anywhere on the page to ensure it has focus

---

## Step 4: Test Keyboard Capture

### Test A: Individual Modifier Keys

Try pressing these combinations and watch the side panel:

1. **Press Ctrl+A** 
   - Side panel should show: `Ctrl+A`
   
2. **Press Shift+A**
   - Side panel should show: `Shift+A`
   
3. **Press Ctrl+Shift+A**
   - Side panel should show: `Ctrl+Shift+A`

**✅ If these show up in the side panel, key capture is working!**

### Test B: The Target Combination

4. **Press Ctrl+Shift+Z**
   - Side panel should show: `✅ Ctrl+Shift+Z` (in green)
   - Console should log: "✅ Ctrl+Shift+Z detected! Toggling cursor control..."
   - Cursor control should toggle ON
   - Purple cursor dot should appear and start moving

5. **Press Ctrl+Shift+Z again**
   - Cursor control should toggle OFF
   - Purple cursor should disappear

---

## Step 5: Check Console Logs

1. Press **F12** to open Developer Tools
2. Click the **Console** tab
3. Clear the console (trash icon)
4. Try these key combinations:

```
Press: Ctrl+A
Expected in console: "Key pressed: {key: 'a', ctrlKey: true, ...}"

Press: Ctrl+Shift+Z
Expected in console: 
  - "Key pressed: {key: 'Z', ctrlKey: true, shiftKey: true, ...}"
  - "✅ Ctrl+Shift+Z detected! Toggling cursor control..."
  - "Cursor control activated" (or "deactivated")
```

---

## Visual Indicators

### In Side Panel:
```
┌─────────────────────────┐
│ Cursor Control Status   │
├─────────────────────────┤
│ Cursor Control: [OFF]   │
│ Movement: Circular      │
│ Last Key Press: ✅ Ctrl+│
│                Shift+Z  │← Should update in real-time!
└─────────────────────────┘
```

### Color Coding:
- **Gray background** (`Waiting...`) - No keys pressed yet
- **Blue background** - Regular key combo detected
- **Green background** (`✅ Ctrl+Shift+Z`) - Correct combo detected!

---

## Troubleshooting

### Side Panel Not Updating?

**Problem:** Key presses don't show in "Last Key Press" field

**Solutions:**
1. Make sure you reloaded the extension after changes
2. Click on the webpage to give it focus
3. Check browser console for errors
4. Try closing and reopening the side panel

### Console Not Showing Logs?

**Problem:** No console output when pressing keys

**Solutions:**
1. Make sure you're on a regular webpage (not chrome:// pages)
2. Check that "Resume Assistant content script loaded" message appears in console
3. Try refreshing the webpage
4. Verify extension is enabled

### Keys Not Being Detected?

**Problem:** Nothing happens when pressing Ctrl+Shift+Z

**Possible Causes:**
1. **Page doesn't have focus** - Click on the page first
2. **Chrome internal page** - Try a regular website
3. **Content script not loaded** - Refresh the page
4. **Extension not reloaded** - Reload in chrome://extensions/
5. **Keyboard layout** - Make sure Z key is working

---

## Expected Results Summary

✅ **Working Correctly If:**
- Side panel shows key combinations in real-time
- Ctrl+Shift+Z shows green checkmark `✅`
- Console logs key presses
- Cursor control toggles on/off
- Purple cursor appears and moves

❌ **Problem If:**
- Side panel stays at "Waiting..."
- No console logs appear
- Ctrl+Shift+Z doesn't toggle cursor
- No cursor appears

---

## Testing Different Scenarios

### Scenario 1: Fresh Page Load
1. Navigate to `www.example.com`
2. Press Ctrl+Shift+Z immediately
3. Should work right away

### Scenario 2: After Scrolling
1. Scroll down the page
2. Press Ctrl+Shift+Z
3. Should still work (cursor centers on viewport)

### Scenario 3: Multiple Tabs
1. Open 3 tabs
2. Press Ctrl+Shift+Z in Tab 1
3. Switch to Tab 2
4. Press Ctrl+Shift+Z in Tab 2
5. Each tab should work independently

### Scenario 4: Rapid Toggle
1. Press Ctrl+Shift+Z
2. Immediately press Ctrl+Shift+Z again (< 1 second)
3. Should toggle cleanly without issues

---

## Debug Checklist

- [ ] Extension loaded in chrome://extensions/
- [ ] Extension reloaded after code changes
- [ ] Side panel opens successfully
- [ ] "Last Key Press" field is visible
- [ ] Console tab is open in DevTools (F12)
- [ ] On a regular webpage (not chrome://)
- [ ] Page has focus (clicked on it)
- [ ] Tried Ctrl+A first (simpler test)
- [ ] Tried Ctrl+Shift+Z
- [ ] Checked console for error messages

---

## Sample Console Output

**Good Output:**
```
Resume Assistant content script loaded. Press Ctrl+Shift+Z to toggle cursor control.
Key pressed: {key: 'a', keyCode: 65, ctrlKey: true, shiftKey: false, altKey: false}
Key pressed: {key: 'Z', keyCode: 90, ctrlKey: true, shiftKey: true, altKey: false}
✅ Ctrl+Shift+Z detected! Toggling cursor control...
Cursor control activated
```

**Problem Output:**
```
Resume Assistant content script loaded. Press Ctrl+Shift+Z to toggle cursor control.
(no further output when pressing keys)
```
↑ This means keys aren't being captured - check troubleshooting section

---

## Advanced Testing

### Test with Console Commands

Open console and type:

```javascript
// Check if content script is loaded
console.log('Testing...');

// Simulate key press programmatically
document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Z',
    keyCode: 90,
    ctrlKey: true,
    shiftKey: true,
    bubbles: true
}));
```

Should trigger the cursor control!

---

## Quick Test Script

Copy this into the console to test:

```javascript
console.log('🧪 Starting keyboard test...');
let testsPassed = 0;

// Test 1: Check if content script loaded
if (window.cursorElement !== undefined || true) {
    console.log('✅ Content script detected');
    testsPassed++;
}

// Test 2: Simulate key press
setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Z',
        keyCode: 90,
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
    }));
    console.log('✅ Simulated Ctrl+Shift+Z');
    testsPassed++;
}, 1000);

// Results
setTimeout(() => {
    console.log(`\n🎯 Tests passed: ${testsPassed}/2`);
    console.log('Now try pressing Ctrl+Shift+Z manually!');
}, 2000);
```

---

## What to Report

If key capture isn't working, provide:

1. **Browser Info:**
   - Chrome version: (Check chrome://version/)
   - Operating System: Windows/Mac/Linux

2. **Extension Status:**
   - Extension enabled? Yes/No
   - Any errors in chrome://extensions/? 

3. **Console Output:**
   - Copy/paste console messages
   - Any red error messages?

4. **Behavior:**
   - Does side panel open? Yes/No
   - Does "Last Key Press" update? Yes/No
   - Do any key combinations work? Which ones?

---

## Success Confirmation

**✅ Test Passed If:**
1. Side panel shows key combinations when you press them
2. Ctrl+Shift+Z shows green `✅ Ctrl+Shift+Z`
3. Console logs "✅ Ctrl+Shift+Z detected!"
4. Cursor control toggles ON/OFF
5. Purple cursor appears and moves in a circle

**🎉 If all above are true, keyboard input capture is working perfectly!**

---

## Next Steps

Once keyboard capture is confirmed working:
1. Test on different websites
2. Test resume upload feature
3. Try the full workflow
4. Check TESTING.md for comprehensive tests

---

**Need help?** Check:
- `TESTING.md` - Full testing guide
- `README.md` - Troubleshooting section
- Browser console - Error messages

