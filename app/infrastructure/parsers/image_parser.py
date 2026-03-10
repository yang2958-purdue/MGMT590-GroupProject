"""Image parser with OCR"""
from PIL import Image
import pytesseract
from typing import Optional


class ImageParser:
    """Parse image files using OCR"""
    
    @staticmethod
    def parse(file_path: str, use_preprocessing: bool = True) -> str:
        """Extract text from image file using OCR"""
        try:
            image = Image.open(file_path)
            
            if use_preprocessing:
                image = ImageParser._preprocess_image(image)
            
            # Perform OCR
            text = pytesseract.image_to_string(image)
            return text.strip()
        except pytesseract.TesseractNotFoundError:
            raise Exception(
                "Tesseract OCR is not installed. "
                "Please install it: https://github.com/tesseract-ocr/tesseract"
            )
        except Exception as e:
            raise Exception(f"Failed to parse image: {str(e)}")
    
    @staticmethod
    def _preprocess_image(image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        image = image.convert('L')
        
        # Increase contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Increase sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        
        return image
    
    @staticmethod
    def is_tesseract_available() -> bool:
        """Check if Tesseract OCR is available"""
        try:
            pytesseract.get_tesseract_version()
            return True
        except:
            return False
