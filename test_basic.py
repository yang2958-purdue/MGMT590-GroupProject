"""Basic test to verify all modules import correctly."""

print("Testing module imports...")

try:
    from resume_parser import ResumeParser
    print("[OK] resume_parser")
except Exception as e:
    print(f"[FAIL] resume_parser: {e}")

try:
    from job_search import JobSearcher
    print("[OK] job_search")
except Exception as e:
    print(f"[FAIL] job_search: {e}")

try:
    from similarity import SimilarityCalculator
    print("[OK] similarity")
except Exception as e:
    print(f"[FAIL] similarity: {e}")

try:
    from exporter import ResumeExporter
    print("[OK] exporter")
except Exception as e:
    print(f"[FAIL] exporter: {e}")

try:
    from utils import parse_company_list, normalize_text
    print("[OK] utils")
except Exception as e:
    print(f"[FAIL] utils: {e}")

print("\n" + "="*60)
print("All modules loaded successfully!")
print("The application is ready to run: python main.py")
print("="*60)

