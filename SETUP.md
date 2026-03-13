# Setup Instructions

## Quick Start

### 1. Generate PNG Icons (Recommended)

Chrome extensions work best with PNG icons. Choose one method:

#### Method A: Using Browser (Easiest)
1. Open `generate-icons.html` in any web browser
2. The icons will automatically download as PNG files
3. Save them in the project directory

#### Method B: Using SVG Files (Temporary)
- SVG icons (`icon16.svg`, `icon48.svg`, `icon128.svg`) are already generated
- Chrome may display warnings but should still work
- Consider converting to PNG for production

#### Method C: Manual Creation
1. Create three PNG files: `icon16.png`, `icon48.png`, `icon128.png`
2. Use any image editor to create gradient icons with "R" letter
3. Recommended colors: gradient from #667eea to #764ba2

### 2. Load Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select folder: `C:\DEVOPS FOLDER\MGMT590-GroupProject`
5. Extension should appear in your extension list

### 3. Using the Extension

1. Click the extension icon in Chrome toolbar
2. Side panel opens on the left
3. Upload a resume (PDF or DOCX)
4. Navigate to any webpage
5. Press **Right Arrow Key (→)** to toggle cursor control
6. Watch the cursor move in a circle!

## Troubleshooting

### Icons Not Showing
- Open `generate-icons.html` in browser to download PNG icons
- Replace SVG references with PNG in `manifest.json`
- Reload the extension

### Extension Won't Load
- Check all files are in the directory
- Enable Developer mode
- Check console for errors in `chrome://extensions/`

### Cursor Control Not Working
- Make sure you're on an actual webpage (not chrome:// pages)
- Press Right Arrow key (→)
- Check browser console for errors (F12)

## File Checklist

Required files:
- ✅ manifest.json
- ✅ sidepanel.html
- ✅ sidepanel.js
- ✅ content.js
- ✅ background.js
- ⚠️ icon16.svg/png
- ⚠️ icon48.svg/png
- ⚠️ icon128.svg/png

## Next Steps

After successful installation:
1. Test resume upload functionality
2. Test cursor control on various websites
3. Check side panel status updates
4. Experiment with the circular cursor movement

## Development Notes

- Currently uses SVG icons (convert to PNG recommended)
- Cursor moves in 100px radius circle
- Right Arrow key is the toggle
- Resume stored in Chrome local storage
- Works on all websites (except Chrome internal pages)

---

For detailed information, see `README.md`

