"""Local OCR client using pytesseract"""
from app.infrastructure.parsers.image_parser import ImageParser


class LocalOCRClient:
    """Local OCR using Tesseract"""
    
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Extract text from image using local OCR"""
        return ImageParser.parse(file_path, use_preprocessing=True)
    
    @staticmethod
    def is_available() -> bool:
        """Check if local OCR is available"""
        return ImageParser.is_tesseract_available()
