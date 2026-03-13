"""Greenhouse-specific adapter"""
import logging
from typing import Dict
from .base_adapter import BaseSiteAdapter

logger = logging.getLogger(__name__)


class GreenhouseAdapter(BaseSiteAdapter):
    """Adapter for Greenhouse application forms"""
    
    def __init__(self, browser_client):
        super().__init__(browser_client)
        self.platform_name = "greenhouse"
    
    def detect(self) -> bool:
        """Detect if current page is Greenhouse"""
        try:
            url = self.browser.page.url.lower()
            content = self.browser.page.content().lower()
            
            return ('greenhouse' in url or 'boards.greenhouse' in url or
                    'greenhouse.io' in url or 'greenhouse' in content)
        except:
            return False
    
    def get_custom_selectors(self) -> Dict[str, str]:
        """
        Greenhouse-specific selectors
        Greenhouse uses specific ID patterns
        """
        return {
            # Personal Information
            'first_name': '#first_name, input[name="first_name"]',
            'last_name': '#last_name, input[name="last_name"]',
            'email': '#email, input[name="email"]',
            'phone': '#phone, input[name="phone"]',
            
            # Location
            'location': '#location, input[name="location"]',
            
            # Professional Links
            'linkedin': '#linkedin_url, input[name="linkedin_url"]',
            'website': '#website, input[name="website"]',
            'github': '#github_url, input[name="github_url"]',
            
            # Application Documents
            'resume_upload': '#resume, input[type="file"][name*="resume"]',
            'cover_letter': '#cover_letter_text, textarea[name*="cover"]',
            
            # Additional fields
            'current_company': '#current_company, input[name="current_company"]',
        }
    
    def pre_fill_setup(self) -> bool:
        """Handle Greenhouse-specific setup"""
        try:
            # Check if there's a "Start Application" or similar button
            start_button = 'button:has-text("Start"), a:has-text("Apply for this job")'
            
            if self.browser.wait_for_selector(start_button, timeout=3000):
                logger.info("Found Greenhouse start button")
                self.browser.click(start_button)
                self.wait_for_page_load()
            
            return True
        except Exception as e:
            logger.debug(f"Greenhouse pre-fill setup: {e}")
            return True
    
    def get_submit_button_selector(self) -> str:
        """Greenhouse submit button selector"""
        return '#submit_app, button[type="submit"]:has-text("Submit Application"), input[value*="Submit"]'
