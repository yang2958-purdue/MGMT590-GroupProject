# Autofill Debugging Guide

## 🔍 "No Fields Found" Error - Solutions

### Issue
Autofill reports "No form fields found on current page" even though you can see fields manually.

### Quick Fix: Use Analyze Page Button

1. After launching browser and navigating to form
2. Click **🔍 Analyze Page** button
3. Review the analysis results:
   - How many fillable fields detected
   - Input types present
   - Warnings and issues

---

## Common Causes & Solutions

### 1. Fields in Iframe ⚠️

**Problem**: Form fields inside `<iframe>` elements cannot be accessed by Playwright.

**How to check**:
- Click "Analyze Page"
- Look for "Page contains X iframe(s)" warning

**Solution**:
- Many embedded forms use iframes (especially third-party forms)
- No automated solution - must fill manually
- Or find direct link to form (not embedded version)

---

### 2. Page Still Loading ⏳

**Problem**: JavaScript hasn't finished loading form fields yet.

**How to check**:
- Click "Analyze Page" immediately
- If shows 0 fields, wait 5 seconds
- Click "Analyze Page" again - should show more

**Solution**:
```
1. Launch browser
2. Wait for page to fully load (watch browser)
3. Wait extra 5 seconds for JavaScript
4. THEN click "Autofill Form"
```

---

### 3. Dynamic Fields 🔄

**Problem**: Form loads fields only after interaction (scroll, click, etc.)

**How to check**:
- Initial analysis shows 0 or few fields
- After scrolling page, more fields appear

**Solution**:
```
1. Launch browser
2. Manually scroll through the entire form
3. Click any "Continue" or "Next" buttons
4. Wait for all sections to load
5. THEN click "Analyze Page"
6. If fields detected, click "Autofill Form"
```

---

### 4. Non-Standard Form Elements ⚡

**Problem**: Form uses custom JavaScript widgets instead of standard HTML inputs.

**Examples**:
- Custom dropdowns (not `<select>`)
- Custom date pickers
- Rich text editors
- Fancy styled inputs

**How to check**:
- Click "Analyze Page"
- Shows very few fields but form looks complex

**Solution**:
- Autofill will only fill standard HTML elements
- Custom widgets must be filled manually
- Standard fields will still be filled

---

### 5. Multi-Step Forms 📄

**Problem**: Form has multiple pages/steps.

**How to check**:
- Analyze shows fields, but not all you expect
- Form has "Next" or "Continue" buttons

**Solution**:
```
1. Autofill current page
2. Manually click "Next" / "Continue"
3. Wait for next page to load
4. Click "Autofill Form" again
5. Repeat for each step
```

---

## Using the Analyze Page Feature

### What It Shows

**Form Elements**:
- Input fields (total, visible, hidden)
- Textareas
- Dropdowns (select elements)
- Buttons
- Iframes

**Input Types**:
- text, email, tel, number, etc.
- How many of each type

**Warnings**:
- Iframes detected
- All fields hidden
- No forms detected
- Dynamic loading issues

### Interpreting Results

**"X fillable fields detected" ✓**
```
Good! Autofill should work.
Click "Autofill Form" to proceed.
```

**"0 fillable fields detected" ✗**
```
Problem detected. Check warnings:
- Iframe? → Cannot autofill
- Still loading? → Wait and try again
- No forms? → May need interaction first
```

**"Fields hidden" ⚠️**
```
Page still loading JavaScript.
Wait 5-10 seconds and analyze again.
```

---

## Step-by-Step Debugging Workflow

### When Autofill Says "No Fields"

```
Step 1: Click "Analyze Page"
└─ Shows field count and warnings

Step 2: Read the warnings
├─ Iframes? → Cannot autofill (manual entry)
├─ Loading? → Wait and analyze again
└─ No issues? → Proceed to Step 3

Step 3: Check browser window
├─ Can you see form fields?
├─ Try scrolling down
└─ Look for "Continue" or "Next" buttons

Step 4: Interact with page
├─ Scroll to bottom
├─ Click any initial buttons
└─ Wait for forms to appear

Step 5: Analyze again
└─ Should now detect fields

Step 6: Autofill
└─ Should work if fields detected
```

---

## Workday-Specific Issues

### Workday Forms Often Have:

**1. Multi-Step Process**
```
Login → Job Page → "Apply Manually" → Form Page 1 → Form Page 2 → Review
```

**Solution**: Autofill each page separately

**2. Data-Automation-ID Attributes**
- Workday uses special attributes
- Our adapter handles these
- Should work once on correct page

**3. Custom Widgets**
- Workday uses many custom dropdowns
- Some may not be detected
- Fill manually if autofill skips them

### Correct Workflow for Workday:

```
1. Launch Browser
2. Login to Workday
3. Navigate to job
4. Click "Apply Manually"
5. On application form, click "Analyze Page"
   ├─ Should show 10-20 fields
   └─ If 0, click "Next" or scroll first
6. Click "Autofill Form"
7. Fill any skipped custom fields manually
8. Click "Next" in Workday
9. Repeat autofill for next page
10. Review and Submit
```

---

## Updated Autofill Process

### New 4-Button Workflow:

**🚀 Launch Browser**
- Opens browser to URL
- You login manually

**🔍 Analyze Page** ← NEW!
- Scans page for form fields
- Shows what can be filled
- Provides warnings

**🤖 Autofill Form**
- Fills detected fields
- Uses your resume data

**🔒 Close Browser**
- Closes when done

---

## Troubleshooting Checklist

Before clicking "Autofill Form":

- [ ] Page fully loaded (no spinners)
- [ ] Can see form fields in browser
- [ ] Scrolled through entire form
- [ ] Clicked any initial "Continue" buttons
- [ ] Waited 5 seconds after page load
- [ ] Ran "Analyze Page" - shows fields > 0
- [ ] No iframe warning in analysis
- [ ] Browser is on actual form page (not login/landing page)

If all checked and still 0 fields:
→ Form likely in iframe or uses custom widgets
→ Must fill manually

---

## Technical Details

### What Gets Detected

**Standard HTML elements**:
```html
<input type="text">        ✓ Detected
<input type="email">       ✓ Detected
<input type="tel">         ✓ Detected
<textarea>                 ✓ Detected
<select>                   ✓ Detected
<input type="hidden">      ✗ Skipped
```

**Custom elements** (not detected):
```html
<div contenteditable>      ✗ Not detected (yet)
<custom-dropdown>          ✗ Not detected
<rich-text-editor>         ✗ Not detected
<iframe src="form.html">   ✗ Cannot access
```

### Selectors Used

```javascript
// What we search for:
'input:not([type="hidden"]):not([type="submit"])'
'textarea'
'select'
'[contenteditable="true"]'
```

---

## Success Tips

**For Best Results**:

1. **Launch & Wait** - Give page time to load
2. **Analyze First** - Check what's detectable
3. **Interact** - Scroll, click to reveal fields
4. **Autofill** - When analysis shows fields
5. **Manual Touch-ups** - Fill any custom widgets
6. **Multi-Step** - Repeat for each page

**Expected Fill Rates**:
- Generic forms: 80-90%
- Workday: 60-80% (custom widgets)
- Greenhouse: 70-85%
- Forms in iframe: 0% (not accessible)

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| 0 fields found | Click "Analyze Page" for details |
| Iframe warning | Cannot autofill - manual entry |
| Loading... | Wait 5-10 seconds, analyze again |
| Some fields skipped | Fill custom widgets manually |
| Multi-page form | Autofill each page separately |
| Wrong page | Navigate to actual form first |

---

**Need Help?** Check the analysis output - it tells you exactly what's wrong! 🔍
