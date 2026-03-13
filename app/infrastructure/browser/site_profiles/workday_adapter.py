"""Workday-specific adapter"""
import logging
from typing import Dict
from .base_adapter import BaseSiteAdapter

logger = logging.getLogger(__name__)


class WorkdayAdapter(BaseSiteAdapter):
    """Adapter for Workday application forms"""
    
    def __init__(self, browser_client):
        super().__init__(browser_client)
        self.platform_name = "workday"
    
    def detect(self) -> bool:
        """Detect if current page is Workday"""
        try:
            url = self.browser.page.url.lower()
            content = self.browser.page.content().lower()
            
            return ('workday' in url or 'myworkdayjobs' in url or
                    'workday' in content)
        except:
            return False
    
    def get_custom_selectors(self) -> Dict[str, str]:
        """
        Workday-specific selectors
        Workday uses data-automation-id attributes
        """
        return {
            # Personal Information
            'first_name': '[data-automation-id*="legalNameSection_firstName"], input[name*="firstName"]',
            'last_name': '[data-automation-id*="legalNameSection_lastName"], input[name*="lastName"]',
            'email': '[data-automation-id*="email"], input[type="email"]',
            'phone': '[data-automation-id*="phone"], input[type="tel"]',
            
            # Address
            'address': '[data-automation-id*="addressSection_addressLine"], input[name*="address"]',
            'city': '[data-automation-id*="addressSection_city"], input[name*="city"]',
            'state': '[data-automation-id*="addressSection_state"], select[name*="state"]',
            'zip': '[data-automation-id*="addressSection_postalCode"], input[name*="zip"]',
            'country': '[data-automation-id*="addressSection_countryRegion"], select[name*="country"]',
            
            # Professional
            'linkedin': '[data-automation-id*="linkedIn"], input[name*="linkedin"]',
            
            # Application Documents
            'resume_upload': '[data-automation-id*="resume"], input[type="file"]',
            'cover_letter': '[data-automation-id*="coverLetter"], textarea',
            
            # Workday-specific fields
            'work_authorization': '[data-automation-id*="legalRight"], select[name*="authorization"]',
            'sponsorship': '[data-automation-id*="sponsorship"], select',
        }
    
    def pre_fill_setup(self) -> bool:
        """
        Handle Workday-specific setup
        """
        try:
            # Click through initial screens if present
            # Workday often has "Apply Manually" vs "Apply with LinkedIn" choices
            apply_manually_selector = '[data-automation-id*="manualApply"], button:has-text("Apply Manually")'
            
            if self.browser.wait_for_selector(apply_manually_selector, timeout=5000):
                logger.info("Found 'Apply Manually' button, clicking...")
                self.browser.click(apply_manually_selector)
                self.wait_for_page_load()
                return True
            
            # Look for "Get Started" or "Begin Application" buttons
            begin_selectors = [
                'button:has-text("Get Started")',
                'button:has-text("Begin Application")',
                '[data-automation-id*="getStarted"]'
            ]
            
            for selector in begin_selectors:
                if self.browser.wait_for_selector(selector, timeout=3000):
                    logger.info(f"Found begin button: {selector}")
                    self.browser.click(selector)
                    self.wait_for_page_load()
                    return True
            
            return True
        
        except Exception as e:
            logger.warning(f"Workday pre-fill setup encountered issue: {e}")
            return True  # Continue anyway
    
    def handle_special_fields(self, field_name: str, value: str) -> bool:
        """
        Handle Workday-specific field types
        """
        # Workday often uses custom dropdowns instead of standard selects
        if field_name in ['country', 'state', 'work_authorization']:
            try:
                # Try to handle Workday's custom dropdown
                # Click the dropdown to open it
                selector = self.get_field_selector(field_name)
                if selector:
                    self.browser.click(selector)
                    self.browser.page.wait_for_timeout(500)
                    
                    # Look for the value in the dropdown options
                    option_selector = f'[data-automation-label*="{value}"], li:has-text("{value}")'
                    if self.browser.wait_for_selector(option_selector, timeout=2000):
                        self.browser.click(option_selector)
                        logger.info(f"Selected Workday dropdown option: {value}")
                        return True
            except Exception as e:
                logger.debug(f"Workday special field handling failed: {e}")
                return False
        
        return False
    
    def post_fill_actions(self) -> bool:
        """
        Workday post-fill actions
        """
        try:
            # Workday sometimes has validation that needs to be triggered
            # Click away from current field to trigger validation
            self.browser.page.evaluate('document.activeElement.blur()')
            self.browser.page.wait_for_timeout(1000)
            return True
        except Exception as e:
            logger.debug(f"Workday post-fill actions issue: {e}")
            return True
    
    def get_submit_button_selector(self) -> str:
        """Workday submit button selector"""
        return '[data-automation-id*="apply"], [data-automation-id*="submit"], button:has-text("Submit")'
    
    def wait_for_page_load(self):
        """Wait for Workday-specific loading indicators"""
        try:
            # Workday uses loading overlays
            loading_selector = '[data-automation-id*="loadingSpinner"], .workday-loading'
            
            # Wait for loading to appear and disappear
            try:
                self.browser.wait_for_selector(loading_selector, timeout=2000)
                self.browser.page.wait_for_selector(loading_selector, state='hidden', timeout=10000)
            except:
                pass  # Loading might not appear
            
            # Standard wait
            self.browser.page.wait_for_load_state('networkidle', timeout=10000)
            
        except Exception as e:
            logger.debug(f"Workday page load wait: {e}")
