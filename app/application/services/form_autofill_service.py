"""Form autofill orchestration service"""
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

from app.domain.models import Resume
from app.infrastructure.browser.playwright_client import PlaywrightClient
from app.infrastructure.browser.field_mapping_service import FieldMappingService, FieldMapping
from app.config.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class AutofillResult:
    """Result of an autofill operation"""
    success: bool
    url: str
    fields_filled: int
    fields_failed: int
    mappings: List[FieldMapping]
    errors: List[str]
    screenshot_path: Optional[str] = None
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class FormAutofillService:
    """Service for automated form filling"""
    
    def __init__(self):
        self.field_mapper = FieldMappingService()
        self.site_adapter = None  # Will be set based on detected site
        self._is_cancelled = False
        self._browser_client = None
    
    def cancel(self):
        """Cancel the current autofill operation"""
        self._is_cancelled = True
        logger.info("Cancellation requested")
        
        # Force close browser immediately (don't wait for graceful close)
        if self._browser_client and not self._browser_client.is_closed():
            logger.info("Force closing browser")
            try:
                # Use force_close for immediate termination
                self._browser_client.force_close()
            except Exception as e:
                logger.error(f"Error force closing browser during cancellation: {e}")
    
    def autofill_existing_browser(
        self,
        resume: Resume,
        browser_client,
        take_screenshot: bool = True
    ) -> AutofillResult:
        """
        Autofill form on already-open browser (for two-step workflow)
        
        Args:
            resume: Parsed resume data
            browser_client: Existing PlaywrightClient instance
            take_screenshot: Take screenshot after filling
            
        Returns:
            AutofillResult with details of operation
        """
        logger.info("Starting autofill on existing browser")
        
        # Reset cancellation flag
        self._is_cancelled = False
        self._browser_client = browser_client
        
        fields_filled = 0
        fields_failed = 0
        errors = []
        mappings = []
        screenshot_path = None
        url = browser_client.page.url
        
        try:
            # Check for cancellation
            if self._is_cancelled:
                logger.info("Autofill cancelled before starting")
                return AutofillResult(
                    success=False,
                    url=url,
                    fields_filled=0,
                    fields_failed=0,
                    mappings=[],
                    errors=["Operation cancelled by user"]
                )
            
            # Detect site type
            site_type = self._detect_site_type(browser_client, url)
            logger.info(f"Detected site type: {site_type}")
            
            # For Workday specifically, use specialized handler
            if site_type == 'workday':
                from app.infrastructure.browser.workday_helper import WorkdayHelper
                logger.info("Using Workday-specific form detection...")
                
                # Wait for Workday form
                WorkdayHelper.wait_for_workday_form(browser_client)
                
                # Try Workday-specific input detection first
                form_elements = WorkdayHelper.get_workday_inputs(browser_client)
                
                if not form_elements:
                    logger.warning("Workday-specific detection found no fields, trying standard detection")
                    form_elements = browser_client.get_all_inputs(include_iframes=True)
            else:
                # For other sites, wait for fields to appear
                if site_type in ['greenhouse', 'lever']:
                    logger.info(f"Waiting for {site_type} form fields to load...")
                    browser_client.wait_for_any_input(timeout=15000)
                
                # Get form fields (with iframe support)
                form_elements = browser_client.get_all_inputs(include_iframes=True)
            logger.info(f"Found {len(form_elements)} form fields")
            
            if not form_elements:
                errors.append("No form fields found on current page")
                errors.append(f"Current URL: {url}")
                errors.append("Possible causes:")
                errors.append("• Fields may be in an iframe (not accessible)")
                errors.append("• Page may still be loading - wait a moment and try again")
                errors.append("• Fields may use non-standard elements")
                errors.append("• Page may require interaction first (click button, scroll)")
                
                logger.error("No form fields detected - see error details for troubleshooting")
                
                return AutofillResult(
                    success=False,
                    url=url,
                    fields_filled=0,
                    fields_failed=0,
                    mappings=[],
                    errors=errors
                )
            
            # Map fields to resume data
            mappings = self.field_mapper.map_fields(form_elements)
            logger.info(f"Mapped {len(mappings)} fields")
            
            # Fill each mapped field
            for mapping in mappings:
                # Check for cancellation before each field
                if self._is_cancelled:
                    logger.info(f"Autofill cancelled after filling {fields_filled} fields")
                    errors.append("Operation cancelled by user")
                    break
                
                try:
                    # Get value from resume
                    value = self.field_mapper.get_resume_value(
                        resume,
                        mapping.resume_field
                    )
                    
                    if not value:
                        logger.debug(f"No value for field: {mapping.resume_field}")
                        continue
                    
                    # Fill the field
                    if self._fill_field(browser_client, mapping, value):
                        fields_filled += 1
                        logger.info(f"Filled {mapping.resume_field}: {mapping.selector}")
                    else:
                        fields_failed += 1
                        errors.append(f"Failed to fill: {mapping.resume_field}")
                
                except Exception as e:
                    fields_failed += 1
                    error_msg = f"Error filling {mapping.resume_field}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            # Check if cancelled before screenshot
            if not self._is_cancelled:
                # Take screenshot if requested
                if take_screenshot:
                    screenshot_path = f"autofill_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    browser_client.screenshot(screenshot_path, full_page=True)
            
            logger.info(f"Autofill completed: {fields_filled} filled, {fields_failed} failed")
            
            return AutofillResult(
                success=fields_filled > 0,
                url=url,
                fields_filled=fields_filled,
                fields_failed=fields_failed,
                mappings=mappings,
                errors=errors,
                screenshot_path=screenshot_path
            )
        
        except Exception as e:
            error_msg = f"Autofill failed with exception: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            
            return AutofillResult(
                success=False,
                url=url,
                fields_filled=fields_filled,
                fields_failed=fields_failed,
                mappings=mappings,
                errors=errors
            )
    
    def autofill_application(
        self,
        resume: Resume,
        url: str,
        headless: bool = None,
        pause_for_review: bool = True,
        take_screenshot: bool = True
    ) -> AutofillResult:
        """
        Autofill a job application form
        
        Args:
            resume: Parsed resume data
            url: Application form URL
            headless: Run browser in headless mode
            pause_for_review: Pause before submission for human review
            take_screenshot: Take screenshot after filling
            
        Returns:
            AutofillResult with details of operation
        """
        logger.info(f"Starting autofill for URL: {url}")
        
        # Reset cancellation flag
        self._is_cancelled = False
        
        fields_filled = 0
        fields_failed = 0
        errors = []
        mappings = []
        screenshot_path = None
        
        try:
            # Use headless setting from parameter or config
            if headless is None:
                headless = Settings.BROWSER_HEADLESS
            
            with PlaywrightClient(headless=headless) as browser:
                self._browser_client = browser
                
                # Check for cancellation
                if self._is_cancelled:
                    logger.info("Autofill cancelled before starting")
                    return AutofillResult(
                        success=False,
                        url=url,
                        fields_filled=0,
                        fields_failed=0,
                        mappings=[],
                        errors=["Operation cancelled by user"]
                    )
                # Navigate to form (with cancellation check)
                try:
                    if not browser.navigate(url):
                        return AutofillResult(
                            success=False,
                            url=url,
                            fields_filled=0,
                            fields_failed=0,
                            mappings=[],
                            errors=["Failed to navigate to URL"]
                        )
                except Exception as e:
                    # If navigation fails (including due to cancellation), return
                    if self._is_cancelled or "closed" in str(e).lower():
                        return AutofillResult(
                            success=False,
                            url=url,
                            fields_filled=0,
                            fields_failed=0,
                            mappings=[],
                            errors=["Operation cancelled by user"]
                        )
                    raise
                
                # Check for cancellation
                if self._is_cancelled:
                    logger.info("Autofill cancelled after navigation")
                    return AutofillResult(
                        success=False,
                        url=url,
                        fields_filled=0,
                        fields_failed=0,
                        mappings=[],
                        errors=["Operation cancelled by user"]
                    )
                
                # Wait a moment for page to stabilize (with shorter intervals for cancellation)
                # Check cancellation every 500ms instead of waiting full 2s
                for _ in range(4):
                    if self._is_cancelled:
                        logger.info("Autofill cancelled during page load wait")
                        return AutofillResult(
                            success=False,
                            url=url,
                            fields_filled=0,
                            fields_failed=0,
                            mappings=[],
                            errors=["Operation cancelled by user"]
                        )
                    try:
                        browser.page.wait_for_timeout(500)
                    except:
                        # Page closed, likely due to cancellation
                        break
                
                # Check for cancellation
                if self._is_cancelled:
                    logger.info("Autofill cancelled during page load")
                    return AutofillResult(
                        success=False,
                        url=url,
                        fields_filled=0,
                        fields_failed=0,
                        mappings=[],
                        errors=["Operation cancelled by user"]
                    )
                
                # Detect site type and load appropriate adapter
                site_type = self._detect_site_type(browser, url)
                logger.info(f"Detected site type: {site_type}")
                
                # Get form fields
                form_elements = browser.get_all_inputs()
                logger.info(f"Found {len(form_elements)} form fields")
                
                if not form_elements:
                    errors.append("No form fields found on page")
                    return AutofillResult(
                        success=False,
                        url=url,
                        fields_filled=0,
                        fields_failed=0,
                        mappings=[],
                        errors=errors
                    )
                
                # Map fields to resume data
                mappings = self.field_mapper.map_fields(form_elements)
                logger.info(f"Mapped {len(mappings)} fields")
                
                # Fill each mapped field
                for mapping in mappings:
                    # Check for cancellation before each field
                    if self._is_cancelled:
                        logger.info(f"Autofill cancelled after filling {fields_filled} fields")
                        errors.append("Operation cancelled by user")
                        break
                    
                    try:
                        # Get value from resume
                        value = self.field_mapper.get_resume_value(
                            resume,
                            mapping.resume_field
                        )
                        
                        if not value:
                            logger.debug(f"No value for field: {mapping.resume_field}")
                            continue
                        
                        # Fill the field
                        if self._fill_field(browser, mapping, value):
                            fields_filled += 1
                            logger.info(f"Filled {mapping.resume_field}: {mapping.selector}")
                        else:
                            fields_failed += 1
                            errors.append(f"Failed to fill: {mapping.resume_field}")
                    
                    except Exception as e:
                        fields_failed += 1
                        error_msg = f"Error filling {mapping.resume_field}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
                
                # Check if cancelled before screenshot
                if not self._is_cancelled:
                    # Take screenshot if requested
                    if take_screenshot:
                        screenshot_path = f"autofill_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                        browser.screenshot(screenshot_path, full_page=True)
                    
                    # Pause for human review
                    if pause_for_review and not headless:
                        browser.pause_for_review(
                            "\n=== AUTOFILL COMPLETE ===\n"
                            f"Filled {fields_filled} fields\n"
                            f"Failed {fields_failed} fields\n"
                            "Please review the form and make any necessary corrections.\n"
                            "Press Enter to close the browser..."
                        )
                
                logger.info(f"Autofill completed: {fields_filled} filled, {fields_failed} failed")
                
                return AutofillResult(
                    success=fields_filled > 0,
                    url=url,
                    fields_filled=fields_filled,
                    fields_failed=fields_failed,
                    mappings=mappings,
                    errors=errors,
                    screenshot_path=screenshot_path
                )
        
        except Exception as e:
            error_msg = f"Autofill failed with exception: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            
            return AutofillResult(
                success=False,
                url=url,
                fields_filled=fields_filled,
                fields_failed=fields_failed,
                mappings=mappings,
                errors=errors
            )
    
    def _detect_site_type(self, browser: PlaywrightClient, url: str) -> str:
        """Detect the type of application site"""
        url_lower = url.lower()
        
        # Check URL patterns
        if 'workday' in url_lower or 'myworkdayjobs' in url_lower:
            return 'workday'
        elif 'greenhouse' in url_lower or 'boards.greenhouse' in url_lower:
            return 'greenhouse'
        elif 'lever' in url_lower or 'jobs.lever' in url_lower:
            return 'lever'
        elif 'taleo' in url_lower:
            return 'taleo'
        elif 'icims' in url_lower:
            return 'icims'
        
        # Check page content for platform indicators
        try:
            page_content = browser.page.content().lower()
            
            if 'workday' in page_content:
                return 'workday'
            elif 'greenhouse' in page_content:
                return 'greenhouse'
            elif 'lever' in page_content:
                return 'lever'
        except Exception as e:
            logger.debug(f"Failed to check page content: {e}")
        
        return 'generic'
    
    def _fill_field(self, browser: PlaywrightClient, mapping: FieldMapping, value: str) -> bool:
        """Fill a single form field based on its type"""
        try:
            if mapping.field_type == 'select':
                # For dropdowns, try to select by value or text
                return browser.select_option(mapping.selector, value)
            
            elif mapping.field_type == 'textarea':
                # For text areas, just fill
                return browser.fill_field(mapping.selector, value)
            
            elif mapping.input_type == 'checkbox':
                # For checkboxes, check if value indicates true
                should_check = value.lower() in ['yes', 'true', '1', 'y']
                return browser.check_checkbox(mapping.selector, should_check)
            
            elif mapping.input_type == 'file':
                # File uploads need special handling
                logger.warning(f"File upload not yet implemented: {mapping.selector}")
                return False
            
            else:
                # Default: text input
                return browser.fill_field(mapping.selector, value)
        
        except Exception as e:
            logger.error(f"Failed to fill field {mapping.selector}: {e}")
            return False
    
    def get_supported_sites(self) -> List[str]:
        """Get list of supported application sites"""
        return [
            'generic',
            'workday',
            'greenhouse',
            'lever',
            'taleo',
            'icims'
        ]
