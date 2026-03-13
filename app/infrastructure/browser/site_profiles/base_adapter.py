"""Base adapter for site-specific form handling"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class BaseSiteAdapter(ABC):
    """Base class for site-specific adapters"""
    
    def __init__(self, browser_client):
        self.browser = browser_client
        self.platform_name = "generic"
    
    @abstractmethod
    def detect(self) -> bool:
        """
        Detect if current page is this platform
        
        Returns:
            True if this adapter applies to current page
        """
        pass
    
    @abstractmethod
    def get_custom_selectors(self) -> Dict[str, str]:
        """
        Get platform-specific selectors
        
        Returns:
            Dictionary mapping field names to platform-specific selectors
        """
        pass
    
    def get_field_selector(self, field_name: str) -> Optional[str]:
        """
        Get selector for a specific field
        
        Args:
            field_name: Semantic field name (e.g., 'first_name', 'email')
            
        Returns:
            CSS selector or None if not found
        """
        selectors = self.get_custom_selectors()
        return selectors.get(field_name)
    
    def pre_fill_setup(self) -> bool:
        """
        Perform any setup before filling (e.g., click continue, accept terms)
        
        Returns:
            True if setup successful
        """
        return True
    
    def post_fill_actions(self) -> bool:
        """
        Perform any actions after filling (e.g., verify data)
        
        Returns:
            True if actions successful
        """
        return True
    
    def handle_special_fields(self, field_name: str, value: str) -> bool:
        """
        Handle platform-specific special fields
        
        Args:
            field_name: Field name
            value: Value to fill
            
        Returns:
            True if handled, False if should use default handling
        """
        return False
    
    def get_submit_button_selector(self) -> Optional[str]:
        """
        Get selector for submit button (for review mode)
        
        Returns:
            CSS selector for submit button or None
        """
        return None
    
    def wait_for_page_load(self):
        """Wait for page-specific loading indicators"""
        try:
            self.browser.page.wait_for_load_state('networkidle', timeout=10000)
        except Exception as e:
            logger.debug(f"Page load wait completed with: {e}")
