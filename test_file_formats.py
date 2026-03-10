"""
Test script to verify PDF and DOCX parsing functionality.
"""

from resume_parser import ResumeParser
import os

def test_format(parser, file_path, format_name):
    """Test parsing a specific file format."""
    print(f"\nTesting {format_name}...")
    print("-" * 60)
    
    if not os.path.exists(file_path):
        print(f"[SKIP] Test file not found: {file_path}")
        return False
    
    success, message = parser.load_from_file(file_path)
    
    if success:
        print(f"[OK] {message}")
        word_count = parser.get_word_count()
        char_count = parser.get_char_count()
        print(f"     Words: {word_count}, Characters: {char_count}")
        
        # Show preview
        preview = parser.get_resume_preview(100)
        print(f"     Preview: {preview}")
        return True
    else:
        print(f"[FAIL] {message}")
        return False

def main():
    """Test all supported file formats."""
    print("=" * 70)
    print("Testing Resume File Format Support")
    print("=" * 70)
    
    parser = ResumeParser()
    results = {}
    
    # Test TXT format (should exist)
    results['TXT'] = test_format(parser, "sample_resume.txt", "TXT Format")
    
    # Test PDF format (if exists)
    parser.clear()
    results['PDF'] = test_format(parser, "sample_resume.pdf", "PDF Format")
    
    # Test DOCX format (if exists)
    parser.clear()
    results['DOCX'] = test_format(parser, "sample_resume.docx", "DOCX Format")
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    for format_name, result in results.items():
        status = "[OK]" if result else "[SKIP]"
        print(f"{status} {format_name} format")
    
    print("\n" + "=" * 70)
    print("Supported Formats:")
    print("  - TXT:  Plain text files")
    print("  - PDF:  Adobe PDF documents")
    print("  - DOCX: Microsoft Word documents (.docx)")
    print("\nNote: Create sample_resume.pdf or sample_resume.docx to test those formats")
    print("=" * 70)

if __name__ == "__main__":
    main()


