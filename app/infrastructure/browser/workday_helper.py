"""Workday-specific helper utilities"""
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class WorkdayHelper:
    """Helper utilities for Workday forms"""
    
    @staticmethod
    def wait_for_workday_form(browser_client, timeout: int = 30000) -> bool:
        """
        Wait for Workday form to fully load
        
        Workday-specific loading patterns:
        - Removes loading overlay
        - Renders form sections
        - Activates input fields
        """
        try:
            page = browser_client.page
            
            logger.info("Waiting for Workday form to load...")
            
            # Wait for common Workday loading indicators to disappear
            loading_selectors = [
                '[data-automation-id*="loading"]',
                '.WDKN',  # Workday loading class
                '[aria-busy="true"]',
            ]
            
            for selector in loading_selectors:
                try:
                    # Wait for loading to appear
                    if browser_client.wait_for_selector(selector, timeout=2000):
                        # Wait for it to disappear
                        page.wait_for_selector(selector, state='hidden', timeout=timeout)
                        logger.info(f"Workday loading indicator cleared: {selector}")
                except:
                    pass  # Loading might not appear
            
            # Wait for Workday form sections to appear
            form_selectors = [
                '[data-automation-id*="formField"]',
                '[data-automation-id*="textInputBox"]',
                'input[data-automation-id]',
                '[class*="applicationForm"]',
            ]
            
            for selector in form_selectors:
                if browser_client.wait_for_selector(selector, timeout=timeout):
                    logger.info(f"Workday form element appeared: {selector}")
                    # Wait a bit more for other fields to render
                    page.wait_for_timeout(2000)
                    return True
            
            logger.warning("Workday form indicators not found")
            return False
            
        except Exception as e:
            logger.error(f"Error waiting for Workday form: {e}")
            return False
    
    @staticmethod
    def get_workday_inputs(browser_client) -> List:
        """
        Get all Workday form inputs using Workday-specific selectors
        """
        try:
            page = browser_client.page
            all_inputs = []
            
            # Workday-specific selectors (data-automation-id attributes)
            workday_selectors = [
                '[data-automation-id]',  # All Workday interactive elements
                'input[data-automation-id]',
                'textarea[data-automation-id]',
                'select[data-automation-id]',
                '[data-automation-id*="textInputBox"]',
                '[data-automation-id*="textAreaField"]',
                '[data-automation-id*="selectWidget"]',
            ]
            
            for selector in workday_selectors:
                try:
                    elements = page.query_selector_all(selector)
                    for elem in elements:
                        if elem not in all_inputs:
                            # Check if it's an input-like element
                            tag = elem.evaluate('el => el.tagName').lower()
                            if tag in ['input', 'textarea', 'select']:
                                all_inputs.append(elem)
                            else:
                                # Check if it has input children
                                input_child = elem.query_selector('input, textarea, select')
                                if input_child and input_child not in all_inputs:
                                    all_inputs.append(input_child)
                    
                    if elements:
                        logger.info(f"Workday selector '{selector}' found {len(elements)} elements")
                
                except Exception as e:
                    logger.debug(f"Workday selector {selector} failed: {e}")
            
            logger.info(f"Total Workday inputs found: {len(all_inputs)}")
            return all_inputs
            
        except Exception as e:
            logger.error(f"Failed to get Workday inputs: {e}")
            return []
    
    @staticmethod
    def diagnose_workday_page(browser_client) -> Dict:
        """
        Diagnose why Workday form isn't being detected
        """
        try:
            page = browser_client.page
            
            diagnosis = {
                'url': page.url,
                'is_workday': 'workday' in page.url.lower(),
                'page_state': '',
                'issues': [],
                'suggestions': []
            }
            
            # Check what's on the page using JavaScript
            result = page.evaluate('''() => {
                const info = {
                    hasForm: document.querySelector('form') !== null,
                    totalInputs: document.querySelectorAll('input').length,
                    visibleInputs: 0,
                    dataAutomationElements: document.querySelectorAll('[data-automation-id]').length,
                    iframes: document.querySelectorAll('iframe').length,
                    shadowRoots: 0,
                    bodyText: document.body ? document.body.innerText.substring(0, 500) : '',
                    formHTML: ''
                };
                
                // Count visible inputs
                document.querySelectorAll('input').forEach(input => {
                    if (input.offsetParent !== null && input.type !== 'hidden') {
                        info.visibleInputs++;
                    }
                });
                
                // Count shadow roots
                document.querySelectorAll('*').forEach(el => {
                    if (el.shadowRoot) info.shadowRoots++;
                });
                
                // Get form HTML if exists
                const form = document.querySelector('form');
                if (form) {
                    info.formHTML = form.outerHTML.substring(0, 1000);
                }
                
                return info;
            }''')
            
            # Analyze results
            if result['dataAutomationElements'] > 0:
                diagnosis['page_state'] = 'Workday application page detected'
                if result['visibleInputs'] == 0:
                    diagnosis['issues'].append('Workday elements present but no visible inputs')
                    diagnosis['suggestions'].append('Try clicking any "Continue" or "Next" button on the page')
                    diagnosis['suggestions'].append('Scroll down to trigger lazy loading')
            
            if result['iframes'] > 0:
                diagnosis['issues'].append(f'{result["iframes"]} iframe(s) detected - fields may be embedded')
                diagnosis['suggestions'].append('Check browser dev tools for iframe src URL')
            
            if result['shadowRoots'] > 0:
                diagnosis['issues'].append(f'{result["shadowRoots"]} Shadow DOM element(s) - cannot access with standard automation')
                diagnosis['suggestions'].append('Workday may be using Web Components - manual fill required')
            
            if result['visibleInputs'] == 0 and result['totalInputs'] > 0:
                diagnosis['issues'].append(f'{result["totalInputs"]} inputs exist but none visible')
                diagnosis['suggestions'].append('Page may still be loading - wait 10 seconds and try again')
            
            if 'loading' in result['bodyText'].lower() or 'please wait' in result['bodyText'].lower():
                diagnosis['issues'].append('Page shows loading message')
                diagnosis['suggestions'].append('Wait for loading to complete')
            
            # Store detailed info
            diagnosis['total_inputs'] = result['totalInputs']
            diagnosis['visible_inputs'] = result['visibleInputs']
            diagnosis['workday_elements'] = result['dataAutomationElements']
            diagnosis['iframes'] = result['iframes']
            diagnosis['shadow_roots'] = result['shadowRoots']
            
            return diagnosis
            
        except Exception as e:
            logger.error(f"Workday diagnosis failed: {e}")
            return {
                'error': str(e),
                'suggestions': ['Could not diagnose page - try manual inspection']
            }
