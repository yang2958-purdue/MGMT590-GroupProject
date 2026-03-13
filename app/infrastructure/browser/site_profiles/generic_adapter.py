"""Generic adapter for standard HTML forms"""
from typing import Dict
from .base_adapter import BaseSiteAdapter


class GenericAdapter(BaseSiteAdapter):
    """Generic adapter for standard HTML forms"""
    
    def __init__(self, browser_client):
        super().__init__(browser_client)
        self.platform_name = "generic"
    
    def detect(self) -> bool:
        """Generic adapter always applies as fallback"""
        return True
    
    def get_custom_selectors(self) -> Dict[str, str]:
        """
        Return common generic selectors
        These are fallback patterns that work across many sites
        """
        return {
            # Personal Info
            'first_name': 'input[name*="first" i][name*="name" i]',
            'last_name': 'input[name*="last" i][name*="name" i]',
            'full_name': 'input[name*="name" i]:not([name*="first"]):not([name*="last"])',
            'email': 'input[type="email"], input[name*="email" i]',
            'phone': 'input[type="tel"], input[name*="phone" i]',
            
            # Address
            'address': 'input[name*="address" i], input[name*="street" i]',
            'city': 'input[name*="city" i]',
            'state': 'select[name*="state" i], input[name*="state" i]',
            'zip': 'input[name*="zip" i], input[name*="postal" i]',
            
            # Professional
            'linkedin': 'input[name*="linkedin" i]',
            'website': 'input[name*="website" i], input[name*="portfolio" i]',
            
            # Application
            'cover_letter': 'textarea[name*="cover" i], textarea[name*="letter" i]',
            'resume_upload': 'input[type="file"][name*="resume" i], input[type="file"][name*="cv" i]',
        }
    
    def get_submit_button_selector(self) -> str:
        """Common submit button selectors"""
        return 'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")'
