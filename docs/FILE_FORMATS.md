# Supported File Formats

The Resume Auto-Fill Bot now supports **three file formats** for resume input:

## 📄 Supported Formats

### 1. Plain Text (.txt)
- **Extension**: `.txt`
- **Encoding**: UTF-8
- **Best for**: Simple, unformatted resumes
- **Pros**: Universal compatibility, easy to edit
- **Cons**: No formatting

### 2. PDF Documents (.pdf)
- **Extension**: `.pdf`
- **Parser**: PyPDF2
- **Best for**: Professional resumes, preserving formatting
- **Pros**: Industry standard, widely accepted
- **Cons**: Text extraction quality varies by PDF type

**Note**: Works best with text-based PDFs. Scanned images or PDFs with complex layouts may not extract well.

### 3. Microsoft Word (.docx)
- **Extension**: `.docx`
- **Parser**: python-docx
- **Best for**: Editable resumes with formatting
- **Pros**: Easy to edit, common format
- **Cons**: Requires .docx (not .doc)

**Note**: Old .doc format is not supported. Please save as .docx.

## 🚀 How to Use

### Using the File Browser

1. Run the application:
   ```powershell
   python main.py
   ```

2. Select Option 1 (Upload or paste resume)

3. Select Option 1 (Browse and select file)

4. The file browser will show:
   ```
   Resume files (*.txt *.pdf *.docx)  ← All formats
   Text files (*.txt)
   PDF files (*.pdf)
   Word documents (*.docx)
   All files (*.*)
   ```

5. Select your resume file and click "Open"

### Manual Path Entry

You can also enter the file path directly:

```
Select option (1-4): 2
Enter file path: C:\Users\YourName\Documents\my_resume.pdf
```

Or with relative path:
```
Enter file path: resume.docx
```

## 🔧 Technical Details

### PDF Extraction

- Extracts text from all pages
- Combines text in reading order
- Handles multi-page resumes
- Skips image-only pages

**Code**: Uses PyPDF2's `PdfReader` and `extract_text()` method

### DOCX Extraction

- Extracts text from all paragraphs
- Includes text from tables
- Preserves paragraph breaks
- Handles nested structures

**Code**: Uses python-docx's `Document` API

### TXT Reading

- Reads UTF-8 encoded text
- Preserves line breaks
- Simple and fast

**Code**: Standard Python file I/O

## 📝 Examples

### Example 1: PDF Resume

```powershell
# Your resume: "John_Doe_Resume.pdf"
python main.py

# Select: 1 → 1 → Browse to PDF → Open
# Output: [OK] Successfully loaded resume from John_Doe_Resume.pdf
```

### Example 2: Word Document

```powershell
# Your resume: "Resume_2024.docx"
python main.py

# Select: 1 → 2 → Type: Resume_2024.docx
# Output: [OK] Successfully loaded resume from Resume_2024.docx
```

### Example 3: Text File

```powershell
# Your resume: "simple_resume.txt"
python main.py

# Select: 1 → 1 → Browse to TXT → Open
# Output: [OK] Successfully loaded resume from simple_resume.txt
```

## ⚠️ Common Issues

### PDF Issues

**Problem**: "PDF appears to be empty"
- **Cause**: Scanned image PDF or encrypted PDF
- **Solution**: Use a text-based PDF or convert to .txt/.docx

**Problem**: "Error reading PDF"
- **Cause**: Corrupted or password-protected PDF
- **Solution**: Try opening and re-saving the PDF

### DOCX Issues

**Problem**: "Old .doc format not supported"
- **Cause**: Using .doc instead of .docx
- **Solution**: Open in Word and "Save As" → .docx format

**Problem**: "Word document appears to be empty"
- **Cause**: Document only contains images or objects
- **Solution**: Ensure there's actual text in the document

### TXT Issues

**Problem**: "Unable to read file. Please ensure it's UTF-8 encoded"
- **Cause**: File uses different encoding (e.g., Latin-1, Windows-1252)
- **Solution**: Re-save file as UTF-8 in your text editor

## 🧪 Testing File Formats

Run the test script to verify format support:

```powershell
python test_file_formats.py
```

This will test:
- TXT parsing (with sample_resume.txt)
- PDF parsing (if sample_resume.pdf exists)
- DOCX parsing (if sample_resume.docx exists)

## 📦 Dependencies

The following packages are required:

```bash
# PDF support
pip install PyPDF2

# Word document support
pip install python-docx
```

These are included in `requirements.txt`.

## 🔍 Behind the Scenes

### Automatic Format Detection

The application automatically detects the file format based on extension:

```python
file_extension = path.suffix.lower()

if file_extension == '.pdf':
    # Use PDF parser
elif file_extension == '.docx':
    # Use DOCX parser
elif file_extension == '.txt':
    # Use TXT parser
else:
    # Unsupported format error
```

### Graceful Degradation

If a parser library isn't installed:
- Clear error message
- Suggests installation command
- Other formats still work

### Text Normalization

After extraction, all text goes through:
1. **Sanitization**: Remove special characters
2. **Normalization**: Clean whitespace
3. **Validation**: Check minimum length (100 chars)

## 💡 Best Practices

### For Best Results:

1. **Use Text-Based PDFs**: Not scanned images
2. **Use .docx**: Not old .doc format
3. **Use UTF-8 for TXT**: Standard encoding
4. **Keep It Simple**: Complex formatting may not extract well
5. **Test First**: Run test_file_formats.py

### Recommended Format:

For most users, **PDF** is recommended because:
- ✅ Professional appearance
- ✅ Widely accepted
- ✅ Can't be accidentally edited
- ✅ Maintains formatting

For editing and customization, use **DOCX**.

For maximum compatibility and simplicity, use **TXT**.

## 🎯 Quick Reference

| Format | Extension | Parser | Best Use Case |
|--------|-----------|--------|---------------|
| Text | `.txt` | Built-in | Simple resumes, maximum compatibility |
| PDF | `.pdf` | PyPDF2 | Professional resumes, final versions |
| Word | `.docx` | python-docx | Editable resumes, frequent updates |

## 🔗 Related Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Getting started guide
- **[USER_GUIDE_FILE_BROWSER.md](USER_GUIDE_FILE_BROWSER.md)** - File browser usage
- **[NEW_FEATURES.md](NEW_FEATURES.md)** - Latest features

---

**Ready to upload your resume?** Just run `python main.py` and select any supported format! 🚀


