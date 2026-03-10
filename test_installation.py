"""
Installation and basic functionality test script
Run this to verify the backend is properly set up
"""
import sys
import importlib

def test_imports():
    """Test that all required packages can be imported"""
    print("Testing Python package imports...")
    
    required_packages = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('pydantic', 'Pydantic'),
        ('anthropic', 'Anthropic'),
        ('sklearn', 'scikit-learn'),
        ('PyPDF2', 'PyPDF2'),
        ('docx', 'python-docx'),
        ('requests', 'requests'),
        ('bs4', 'beautifulsoup4'),
        ('serpapi', 'serpapi'),
    ]
    
    failed = []
    passed = []
    
    for package, name in required_packages:
        try:
            importlib.import_module(package)
            passed.append(name)
            print(f"  [OK] {name}")
        except ImportError:
            failed.append(name)
            print(f"  [FAIL] {name} - NOT INSTALLED")
    
    print(f"\nResults: {len(passed)}/{len(required_packages)} packages available")
    
    if failed:
        print(f"\nMissing packages: {', '.join(failed)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    return True

def test_project_structure():
    """Test that project files exist"""
    print("\nTesting project structure...")
    
    import os
    
    required_files = [
        'backend/main.py',
        'backend/requirements.txt',
        'backend/services/resume_parser.py',
        'backend/services/job_scraper.py',
        'backend/services/fit_scorer.py',
        'backend/services/resume_tailor.py',
        'backend/models/schemas.py',
        'frontend/package.json',
        'frontend/src/App.jsx',
        'README.md',
    ]
    
    failed = []
    passed = []
    
    # Get project root (parent of this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for filepath in required_files:
        full_path = os.path.join(script_dir, filepath)
        if os.path.exists(full_path):
            passed.append(filepath)
            print(f"  [OK] {filepath}")
        else:
            failed.append(filepath)
            print(f"  [FAIL] {filepath} - NOT FOUND")
    
    print(f"\nResults: {len(passed)}/{len(required_files)} files found")
    
    if failed:
        print(f"\nMissing files: {', '.join(failed)}")
        return False
    
    return True

def test_backend_imports():
    """Test that backend modules can be imported"""
    print("\nTesting backend module imports...")
    
    try:
        # Add backend to path
        import os
        import sys
        backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
        sys.path.insert(0, backend_dir)
        
        from services import resume_parser, job_scraper, fit_scorer, resume_tailor
        print("  [OK] Services modules imported successfully")
        
        from models import schemas
        print("  [OK] Models module imported successfully")
        
        return True
    except Exception as e:
        print(f"  [FAIL] Import failed: {e}")
        return False

def test_api_keys():
    """Check if API keys are configured"""
    print("\nChecking API key configuration...")
    
    import os
    from pathlib import Path
    
    env_file = Path(__file__).parent / 'backend' / '.env'
    
    if not env_file.exists():
        print("  [WARN] .env file not found")
        print("  -> Create backend/.env with your API keys")
        print("  -> See README.md for instructions")
        return False
    
    # Try to load .env
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
        
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        serpapi_key = os.getenv('SERPAPI_API_KEY')
        
        if anthropic_key:
            print(f"  [OK] Claude API key configured (starts with: {anthropic_key[:10]}...)")
        else:
            print("  [WARN] Claude API key not found (required for resume tailoring)")
        
        if serpapi_key:
            print(f"  [OK] SerpAPI key configured (starts with: {serpapi_key[:10]}...)")
        else:
            print("  [WARN] SerpAPI key not found (job search will be limited)")
        
        return bool(anthropic_key or serpapi_key)
    
    except ImportError:
        print("  [WARN] python-dotenv not installed")
        print("  Run: pip install python-dotenv")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Job Search & Resume Tailoring Tool - Installation Test")
    print("=" * 60)
    print()
    
    results = {
        'Package Imports': test_imports(),
        'Project Structure': test_project_structure(),
        'Backend Modules': test_backend_imports(),
        'API Keys': test_api_keys(),
    }
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status:8} - {test_name}")
    
    all_passed = all(results.values())
    
    print()
    if all_passed:
        print("SUCCESS! All tests passed! Your installation is ready.")
        print()
        print("Next steps:")
        print("1. Configure API keys in backend/.env")
        print("2. Run: start-backend.bat (or python backend/main.py)")
        print("3. Run: start-frontend.bat (or cd frontend && npm run dev)")
        print("4. Open: http://localhost:3000")
    else:
        print("WARNING: Some tests failed. Please fix the issues above.")
        print()
        print("Quick fixes:")
        print("- Missing packages: pip install -r backend/requirements.txt")
        print("- Missing files: Check if you're in the project root directory")
        print("- API keys: Create backend/.env with your keys")
    
    print()
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())

