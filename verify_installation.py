"""Quick script to verify all dependencies are installed correctly."""

def main():
    print("=" * 70)
    print("Verifying Installation")
    print("=" * 70)
    
    errors = []
    
    # Test NumPy
    try:
        import numpy
        print(f"[OK] NumPy {numpy.__version__}")
    except ImportError as e:
        print(f"[FAIL] NumPy")
        errors.append(f"NumPy: {e}")
    
    # Test scikit-learn
    try:
        import sklearn
        print(f"[OK] scikit-learn {sklearn.__version__}")
    except ImportError as e:
        print(f"[FAIL] scikit-learn")
        errors.append(f"scikit-learn: {e}")
    
    # Test requests
    try:
        import requests
        print(f"[OK] requests {requests.__version__}")
    except ImportError as e:
        print(f"[FAIL] requests")
        errors.append(f"requests: {e}")
    
    # Test BeautifulSoup
    try:
        import bs4
        print(f"[OK] beautifulsoup4 {bs4.__version__}")
    except ImportError as e:
        print(f"[FAIL] beautifulsoup4")
        errors.append(f"beautifulsoup4: {e}")
    
    # Test PyPDF2
    try:
        import PyPDF2
        print(f"[OK] PyPDF2 {PyPDF2.__version__}")
    except ImportError as e:
        print(f"[FAIL] PyPDF2")
        errors.append(f"PyPDF2: {e}")
    
    # Test python-docx
    try:
        import docx
        print(f"[OK] python-docx")
    except ImportError as e:
        print(f"[FAIL] python-docx")
        errors.append(f"python-docx: {e}")
    
    print("=" * 70)
    
    if errors:
        print("\n[X] Installation incomplete. Missing packages:")
        for error in errors:
            print(f"  - {error}")
        print("\nPlease run: pip install -r requirements.txt")
        return 1
    else:
        print("\n[SUCCESS] All packages installed successfully!")
        print("\nYou're ready to run the application:")
        print("  python main.py")
        return 0

if __name__ == "__main__":
    exit(main())

