"""Playwright browser automation client"""
import logging
from typing import Optional
from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
from app.config.settings import Settings

logger = logging.getLogger(__name__)


class PlaywrightClient:
    """Wrapper around Playwright for browser automation"""
    
    def __init__(self, headless: bool = None, timeout: int = None):
        self.headless = headless if headless is not None else Settings.BROWSER_HEADLESS
        self.timeout = timeout if timeout is not None else Settings.BROWSER_TIMEOUT
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._is_closed = False
        
    def __enter__(self):
        """Context manager entry"""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
    
    def start(self):
        """Start browser instance"""
        try:
            logger.info("Starting Playwright browser...")
            self.playwright = sync_playwright().start()
            
            # Launch browser (Chromium by default)
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=['--start-maximized'] if not self.headless else []
            )
            
            # Create context
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080} if not self.headless else None
            )
            
            # Set default timeout
            self.context.set_default_timeout(self.timeout)
            
            # Create page
            self.page = self.context.new_page()
            
            logger.info("Browser started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start browser: {e}")
            self.close()
            raise
    
    def navigate(self, url: str, wait_until: str = "networkidle") -> bool:
        """Navigate to URL"""
        try:
            logger.info(f"Navigating to: {url}")
            self.page.goto(url, wait_until=wait_until)
            logger.info(f"Successfully loaded: {url}")
            return True
        except Exception as e:
            logger.error(f"Failed to navigate to {url}: {e}")
            return False
    
    def wait_for_selector(self, selector: str, timeout: Optional[int] = None, state: str = "visible") -> bool:
        """Wait for element to appear"""
        try:
            self.page.wait_for_selector(
                selector,
                timeout=timeout or self.timeout,
                state=state
            )
            return True
        except Exception as e:
            logger.debug(f"Selector not found: {selector} - {e}")
            return False
    
    def wait_for_any_input(self, timeout: int = 10000) -> bool:
        """Wait for any input field to appear on page"""
        selectors_to_try = [
            'input[type="text"]',
            'input[type="email"]',
            'input:not([type="hidden"])',
            'textarea',
            'select',
            '[role="textbox"]'
        ]
        
        for selector in selectors_to_try:
            if self.wait_for_selector(selector, timeout=timeout):
                logger.info(f"Found input with selector: {selector}")
                return True
        
        logger.warning("No input fields appeared within timeout")
        return False
    
    def fill_field(self, selector: str, value: str, delay: int = 50) -> bool:
        """Fill a form field"""
        try:
            element = self.page.query_selector(selector)
            if not element:
                logger.warning(f"Element not found: {selector}")
                return False
            
            # Clear existing value
            element.fill("")
            
            # Type new value with delay to simulate human typing
            element.type(value, delay=delay)
            
            logger.debug(f"Filled field {selector} with value")
            return True
            
        except Exception as e:
            logger.error(f"Failed to fill field {selector}: {e}")
            return False
    
    def click(self, selector: str) -> bool:
        """Click an element"""
        try:
            self.page.click(selector)
            logger.debug(f"Clicked: {selector}")
            return True
        except Exception as e:
            logger.error(f"Failed to click {selector}: {e}")
            return False
    
    def select_option(self, selector: str, value: str) -> bool:
        """Select dropdown option"""
        try:
            self.page.select_option(selector, value=value)
            logger.debug(f"Selected option {value} in {selector}")
            return True
        except Exception as e:
            logger.error(f"Failed to select option in {selector}: {e}")
            return False
    
    def check_checkbox(self, selector: str, checked: bool = True) -> bool:
        """Check or uncheck checkbox"""
        try:
            if checked:
                self.page.check(selector)
            else:
                self.page.uncheck(selector)
            logger.debug(f"Set checkbox {selector} to {checked}")
            return True
        except Exception as e:
            logger.error(f"Failed to set checkbox {selector}: {e}")
            return False
    
    def get_text(self, selector: str) -> Optional[str]:
        """Get text content of element"""
        try:
            return self.page.text_content(selector)
        except Exception as e:
            logger.debug(f"Failed to get text from {selector}: {e}")
            return None
    
    def screenshot(self, path: str, full_page: bool = False) -> bool:
        """Take screenshot"""
        try:
            self.page.screenshot(path=path, full_page=full_page)
            logger.info(f"Screenshot saved to: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to take screenshot: {e}")
            return False
    
    def get_all_inputs(self, include_iframes: bool = True, include_shadow: bool = True) -> list:
        """Get all form input elements on page"""
        try:
            # Wait longer for dynamic content to load
            logger.info("Waiting for page to stabilize...")
            self.page.wait_for_timeout(3000)  # 3 seconds for Workday/dynamic forms
            
            # Wait for network to be idle (AJAX requests complete)
            try:
                self.page.wait_for_load_state('networkidle', timeout=10000)
            except:
                logger.debug("Network idle timeout - continuing anyway")
            
            all_inputs = []
            
            # Try multiple selectors to catch various input types
            selectors = [
                'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])',
                'textarea',
                'select',
                '[contenteditable="true"]',
                '[role="textbox"]',  # ARIA textbox
                '[role="combobox"]',  # ARIA combobox (custom dropdowns)
                'input',  # Try all inputs as last resort
                '[data-automation-id]',  # Workday specific
            ]
            
            # Get elements from main page
            for selector in selectors:
                try:
                    elements = self.page.query_selector_all(selector)
                    # Filter out hidden inputs if we already got them
                    if selector == 'input':
                        elements = [e for e in elements if e not in all_inputs]
                    all_inputs.extend(elements)
                    if elements:
                        logger.debug(f"Found {len(elements)} elements with selector: {selector}")
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
            
            logger.info(f"Main page: {len(all_inputs)} form elements")
            
            # Try Shadow DOM if enabled
            if include_shadow and len(all_inputs) == 0:
                logger.info("No elements in light DOM, trying Shadow DOM...")
                try:
                    shadow_inputs = self.page.evaluate('''() => {
                        const inputs = [];
                        
                        // Find all elements with shadow root
                        const allElements = document.querySelectorAll('*');
                        allElements.forEach(el => {
                            if (el.shadowRoot) {
                                // Search inside shadow root
                                const shadowInputs = el.shadowRoot.querySelectorAll('input, textarea, select');
                                shadowInputs.forEach(input => {
                                    inputs.push({
                                        tag: input.tagName.toLowerCase(),
                                        type: input.type,
                                        name: input.name,
                                        id: input.id,
                                        placeholder: input.placeholder
                                    });
                                });
                            }
                        });
                        
                        return inputs;
                    }''')
                    
                    if shadow_inputs and len(shadow_inputs) > 0:
                        logger.info(f"Found {len(shadow_inputs)} elements in Shadow DOM")
                        logger.warning("Shadow DOM elements detected but cannot be directly manipulated")
                        logger.warning("This is a limitation of current implementation")
                    
                except Exception as e:
                    logger.debug(f"Shadow DOM search failed: {e}")
            
            # Try to access iframe content if present
            if include_iframes:
                try:
                    iframes = self.page.frames
                    logger.info(f"Found {len(iframes)} frames total")
                    
                    for i, frame in enumerate(iframes):
                        if frame == self.page.main_frame:
                            continue  # Skip main frame
                        
                        try:
                            # Try to access iframe content
                            for selector in selectors:
                                try:
                                    iframe_elements = frame.query_selector_all(selector)
                                    if iframe_elements:
                                        all_inputs.extend(iframe_elements)
                                        logger.info(f"Frame {i}: Found {len(iframe_elements)} elements with {selector}")
                                except Exception as e:
                                    logger.debug(f"Frame {i} selector {selector} failed: {e}")
                        except Exception as e:
                            logger.debug(f"Cannot access frame {i}: {e}")
                    
                except Exception as e:
                    logger.debug(f"Iframe access failed: {e}")
            
            # Log what we found
            logger.info(f"Total form elements found (including iframes): {len(all_inputs)}")
            
            # Debug: Log page state if no fields
            if len(all_inputs) == 0:
                logger.warning("No form elements found - debugging page state")
                logger.warning(f"Current URL: {self.page.url}")
                logger.warning(f"Page title: {self.page.title()}")
                
                # Check if there are ANY input elements at all (including hidden)
                all_elements = self.page.query_selector_all('input, textarea, select')
                logger.warning(f"Total input/textarea/select elements (including hidden): {len(all_elements)}")
                
                # Check for iframes
                iframes = self.page.query_selector_all('iframe')
                logger.warning(f"Iframes in page: {len(iframes)}")
                
                # Try to get page HTML snippet
                try:
                    body_text = self.page.evaluate('() => document.body.innerText')
                    logger.warning(f"Page has text content: {len(body_text)} characters")
                    
                    # Check if it's a loading/redirect page
                    if 'loading' in body_text.lower() or 'redirecting' in body_text.lower():
                        logger.warning("Page appears to be loading or redirecting")
                except:
                    pass
            
            return all_inputs
        except Exception as e:
            logger.error(f"Failed to get inputs: {e}")
            return []
    
    def get_element_attributes(self, element) -> dict:
        """Extract attributes from an element"""
        try:
            return {
                'tag': element.evaluate('el => el.tagName').lower(),
                'type': element.get_attribute('type'),
                'name': element.get_attribute('name'),
                'id': element.get_attribute('id'),
                'placeholder': element.get_attribute('placeholder'),
                'aria_label': element.get_attribute('aria-label'),
                'class': element.get_attribute('class'),
                'required': element.get_attribute('required') is not None,
            }
        except Exception as e:
            logger.debug(f"Failed to get element attributes: {e}")
            return {}
    
    def pause_for_review(self, message: str = "Review the form and press Enter to continue..."):
        """Pause execution for human review"""
        if not self.headless:
            logger.info(message)
            input(message)
    
    def is_closed(self) -> bool:
        """Check if browser is closed"""
        return self._is_closed
    
    def force_close(self):
        """Force close browser immediately without cleanup"""
        try:
            # Try to close browser context first (fastest)
            if self.browser and not self._is_closed:
                try:
                    self.browser.close()
                except:
                    pass
            
            # Stop playwright
            if self.playwright:
                try:
                    self.playwright.stop()
                except:
                    pass
            
            self._is_closed = True
            logger.info("Browser force closed")
        except Exception as e:
            logger.error(f"Error force closing browser: {e}")
            self._is_closed = True
    
    def close(self):
        """Close browser and cleanup"""
        if self._is_closed:
            return
        
        try:
            if self.page:
                self.page.close()
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            self._is_closed = True
            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Error closing browser: {e}")
            # Try force close as fallback
            try:
                self.force_close()
            except:
                pass
            self._is_closed = True
