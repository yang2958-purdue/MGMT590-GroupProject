"""Plain text parser"""


class TextParser:
    """Parse plain text files"""
    
    @staticmethod
    def parse(file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
    
    @staticmethod
    def parse_from_string(text: str) -> str:
        """Parse text directly from string"""
        return text
