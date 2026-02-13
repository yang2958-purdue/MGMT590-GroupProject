# Installation Troubleshooting Guide

## Issue: scikit-learn Installation Error on Windows

If you encounter a "metadata-generation-failed" error when installing scikit-learn, try these solutions:

### Solution 1: Try the Updated Requirements (Recommended)

I've updated `requirements.txt` with flexible version constraints. Try installing again:

```powershell
# Make sure virtual environment is activated
venv\Scripts\activate

# Upgrade pip first
python -m pip install --upgrade pip

# Install with updated requirements
pip install -r requirements.txt
```

### Solution 2: Install Pre-built Wheels

Install packages one at a time to identify which one is causing issues:

```powershell
# Install core dependencies first
pip install numpy
pip install requests beautifulsoup4

# Install scikit-learn (should download pre-built wheel)
pip install scikit-learn
```

### Solution 3: Use Specific Compatible Versions

If you're using Python 3.13+, try these versions:

```powershell
pip install numpy>=1.26.0
pip install scikit-learn>=1.4.0
pip install requests beautifulsoup4
```

### Solution 4: Use Conda (Alternative Package Manager)

If pip continues to fail, use Conda instead:

```powershell
# If you have Conda/Miniconda installed
conda create -n resume-bot python=3.11
conda activate resume-bot
conda install numpy scikit-learn requests beautifulsoup4
```

### Solution 5: Manual Installation with Pre-built Binaries

Download pre-built wheels from:
- https://pypi.org/project/scikit-learn/#files
- https://pypi.org/project/numpy/#files

Then install manually:

```powershell
pip install path\to\downloaded\numpy-xxx.whl
pip install path\to\downloaded\scikit_learn-xxx.whl
pip install requests beautifulsoup4
```

### Solution 6: Install Microsoft C++ Build Tools (If needed)

Some Python packages require compilation. Install build tools:

1. Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Install "Desktop development with C++"
3. Restart your terminal
4. Try `pip install -r requirements.txt` again

## Verification

After installation, verify everything works:

```powershell
python -c "import numpy; print('NumPy:', numpy.__version__)"
python -c "import sklearn; print('scikit-learn:', sklearn.__version__)"
python -c "import requests; print('requests:', requests.__version__)"
```

If all imports succeed, you're ready to run the application!

```powershell
python main.py
```

## Still Having Issues?

### Check Your Python Version

```powershell
python --version
```

Recommended: Python 3.9 - 3.12 for best compatibility

### Use Python 3.11 Specifically

If you have multiple Python versions, you might want to use Python 3.11 which has excellent package support:

```powershell
# Create virtual environment with specific Python version
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Minimal Installation (Last Resort)

If scikit-learn absolutely won't install, we can use a fallback that only requires difflib (built-in):

```powershell
# Install only these
pip install requests beautifulsoup4
```

Then modify `similarity.py` to only use difflib (I can help with this if needed).

## Common Error Messages

### "error: Microsoft Visual C++ 14.0 or greater is required"
- Solution: Install Visual C++ Build Tools (Solution 6 above)

### "No matching distribution found"
- Solution: Upgrade pip (`python -m pip install --upgrade pip`)
- Or use flexible version constraints (already done in updated requirements.txt)

### "Permission denied"
- Solution: Run PowerShell as Administrator
- Or use `--user` flag: `pip install --user -r requirements.txt`

### Import errors after installation
- Solution: Make sure virtual environment is activated
- Verify with: `where python` (should point to venv folder)

## Contact

If none of these solutions work, please provide:
1. Your Python version (`python --version`)
2. Your Windows version
3. Full error message
4. Output of `pip --version`

