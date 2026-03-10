"""PDF parser"""
import pypdf
from typing import Optional


class PDFParser:
    """Parse PDF files"""
    
    @staticmethod
    def parse(file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as f:
                reader = pypdf.PdfReader(f)
                
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            return text.strip()
        except Exception as e:
            raise Exception(f"Failed to parse PDF: {str(e)}")
    
    @staticmethod
    def is_text_extractable(file_path: str) -> bool:
        """Check if PDF contains extractable text"""
        try:
            with open(file_path, 'rb') as f:
                reader = pypdf.PdfReader(f)
                if len(reader.pages) > 0:
                    first_page_text = reader.pages[0].extract_text()
                    return len(first_page_text.strip()) > 50
            return False
        except:
            return False
