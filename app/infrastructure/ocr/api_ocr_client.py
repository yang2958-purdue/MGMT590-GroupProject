"""API-based OCR client"""
import requests
from typing import Optional
from app.config.settings import Settings
from app.config.endpoints import OCRAPIEndpoints


class APIOCRClient:
    """API-based OCR client"""
    
    def __init__(self, api_key: Optional[str] = None, timeout: int = 30):
        self.api_key = api_key or Settings.OCR_API_KEY
        self.timeout = timeout
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from image using API"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                headers = {}
                
                if self.api_key:
                    headers['Authorization'] = f'Bearer {self.api_key}'
                
                response = requests.post(
                    OCRAPIEndpoints.extract_text(),
                    files=files,
                    headers=headers,
                    timeout=self.timeout
                )
                
                response.raise_for_status()
                data = response.json()
                
                return data.get('text', '')
        except requests.RequestException as e:
            raise Exception(f"OCR API request failed: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to extract text via API: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if API OCR is available"""
        return bool(self.api_key)
