# Step-by-Step: Using the File Browser

## Starting the Application

1. Open PowerShell or Command Prompt

2. Navigate to the project folder:
```powershell
cd "C:\DEVOPS FOLDER\MGMT590-GroupProject"
```

3. Run the application:
```powershell
python main.py
```

## You'll See This Menu

```
======================================================================
                    RESUME AUTO-FILL BOT
======================================================================
A minimal CLI tool for matching your resume to job postings
======================================================================


----------------------------------------------------------------------
MAIN MENU
----------------------------------------------------------------------
1. Upload or paste resume
2. Enter target companies
3. Enter desired role
4. Run job search
5. View ranked results
6. Export tailored resume
7. View current session info
8. Clear session and start over
9. Exit
----------------------------------------------------------------------

Select option (1-9):
```

## Step 1: Select Resume Upload

Type `1` and press Enter:

```
Select option (1-9): 1
```

## Step 2: Choose File Browser Method

You'll see:

```
----------------------------------------------------------------------
RESUME INPUT
----------------------------------------------------------------------
1. Browse and select file         ← Choose this for visual picker!
2. Enter file path manually
3. Paste text directly
4. Back to main menu

Select option (1-4):
```

Type `1` and press Enter:

```
Select option (1-4): 1
```

## Step 3: File Browser Opens!

You'll see:

```
>>> Opening file browser...
```

**A Windows file dialog will pop up!** It looks like this:

```
┌────────────────────────────────────────────────────┐
│ Select Resume File                          [×][□][×]│
├────────────────────────────────────────────────────┤
│ Look in: [MGMT590-GroupProject          ▼]        │
├────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │
│ │ 📁 backend                                     │ │
│ │ 📁 frontend                                    │ │
│ │ 📄 exporter.py                                 │ │
│ │ 📄 job_search.py                               │ │
│ │ 📄 main.py                                     │ │
│ │ 📄 README.md                                   │ │
│ │ 📄 sample_resume.txt         ← Your file!      │ │
│ │ 📄 similarity.py                               │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ File name: [                              ]        │
│ Files of type: [Text files (*.txt)        ▼]      │
│                                                    │
│                           [Open]  [Cancel]         │
└────────────────────────────────────────────────────┘
```

## Step 4: Select Your Resume

- **Navigate**: Click folders to explore
- **Find your file**: Look for `sample_resume.txt` or your own resume
- **Click once** to select the file
- **Click "Open"** or **double-click** the file

## Step 5: Resume Loaded!

Back in the terminal, you'll see:

```
Selected: C:\DEVOPS FOLDER\MGMT590-GroupProject\sample_resume.txt

[OK] Successfully loaded resume from sample_resume.txt

Preview:
JOHN DOE
Software Engineer
Email: john.doe@email.com | Phone: (555) 123-4567 | 
LinkedIn: linkedin.com/in/johndoe

SUMMARY
Passionate software engineer...
```

**Success!** Your resume is now loaded.

## Alternative: Manual Path Entry

If you prefer typing or the file browser doesn't work:

1. Select Option 1 (Upload resume)
2. Select Option **2** (Enter file path manually)
3. Type or paste the path:

```
Enter file path: C:\Users\YourName\Documents\my_resume.txt
```

or if it's in the current folder:

```
Enter file path: sample_resume.txt
```

## Tips & Tricks

### Tip 1: File Type Filter
The file browser shows `.txt` files by default. To see all files, change the dropdown to "All files (*.*)"

### Tip 2: Quick Navigate
In the file browser:
- Type letters to jump to files starting with that letter
- Use arrow keys to move up/down
- Press Enter to select highlighted file

### Tip 3: Drag & Drop Path
Instead of browsing:
1. Select Option 2 (manual path)
2. Open File Explorer, find your resume
3. Hold Shift and right-click the file
4. Click "Copy as path"
5. Paste into the terminal (right-click in PowerShell)

### Tip 4: Using Sample Resume
The easiest way to test:
- Option 1 → Option 1 → Select `sample_resume.txt`
- OR Option 1 → Option 2 → Type: `sample_resume.txt`

## What's Next?

After loading your resume:

1. Press Enter to return to main menu
2. Select Option 2: Enter target companies
3. Select Option 3: Enter desired role
4. Select Option 4: Run job search
5. Select Option 5: View results!

## Troubleshooting

### "File browser not available"
- tkinter isn't installed (rare)
- **Solution**: Use Option 2 to enter path manually

### "No file selected"
- You clicked Cancel in the file browser
- **Solution**: Try again or use Option 2

### "File not found"
- Wrong path or file doesn't exist
- **Solution**: Use Option 1 (file browser) to visually locate it

### File browser doesn't open
- May be hidden behind other windows
- **Solution**: Check taskbar for the dialog window

## Example Session

Here's a complete example:

```powershell
PS> python main.py

# Menu appears
Select option (1-9): 1

# Resume input menu
Select option (1-4): 1

# File browser opens - select sample_resume.txt
Selected: C:\...\sample_resume.txt
[OK] Successfully loaded resume

# Back to main menu
Select option (1-9): 2
Companies: Google, Microsoft, Amazon
[OK] Set 3 target companies

Select option (1-9): 3
Role: Software Engineer Intern
[OK] Set desired role

Select option (1-9): 4
>>> Searching for jobs...
[OK] Found 9 job postings
>>> Computing similarity scores...
[OK] Ranked 9 jobs by relevance

Select option (1-9): 5
# See your ranked matches!
```

---

**Enjoy the improved user experience!** 🚀

