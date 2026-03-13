"""Page analyzer for debugging autofill issues"""
import logging

logger = logging.getLogger(__name__)


class PageAnalyzer:
    """Analyze page structure to help debug autofill issues"""
    
    @staticmethod
    def analyze_page(browser_client):
        """
        Analyze the current page and provide detailed information
        
        Returns:
            dict with page analysis results
        """
        try:
            page = browser_client.page
            
            analysis = {
                'url': page.url,
                'title': page.title(),
                'has_forms': False,
                'input_count': 0,
                'textarea_count': 0,
                'select_count': 0,
                'button_count': 0,
                'iframe_count': 0,
                'visible_inputs': 0,
                'hidden_inputs': 0,
                'input_types': {},
                'form_ids': [],
                'warnings': [],
                'has_shadow_dom': False,
                'shadow_input_count': 0,
                'page_snapshot': ''
            }
            
            # Count different element types
            all_inputs = page.query_selector_all('input')
            analysis['input_count'] = len(all_inputs)
            
            all_textareas = page.query_selector_all('textarea')
            analysis['textarea_count'] = len(all_textareas)
            
            all_selects = page.query_selector_all('select')
            analysis['select_count'] = len(all_selects)
            
            all_buttons = page.query_selector_all('button, input[type="submit"]')
            analysis['button_count'] = len(all_buttons)
            
            all_iframes = page.query_selector_all('iframe')
            analysis['iframe_count'] = len(all_iframes)
            
            # Check for forms
            forms = page.query_selector_all('form')
            analysis['has_forms'] = len(forms) > 0
            
            for form in forms:
                form_id = form.get_attribute('id')
                if form_id:
                    analysis['form_ids'].append(form_id)
            
            # Analyze input types
            for input_elem in all_inputs:
                input_type = input_elem.get_attribute('type') or 'text'
                
                # Check if hidden
                is_hidden = input_type == 'hidden'
                is_visible = input_elem.is_visible() if not is_hidden else False
                
                if is_hidden:
                    analysis['hidden_inputs'] += 1
                elif is_visible:
                    analysis['visible_inputs'] += 1
                
                # Count by type
                if input_type not in analysis['input_types']:
                    analysis['input_types'][input_type] = 0
                analysis['input_types'][input_type] += 1
            
            # Add warnings
            if analysis['iframe_count'] > 0:
                analysis['warnings'].append(
                    f"Page contains {analysis['iframe_count']} iframe(s) - "
                    "form fields inside iframes cannot be accessed"
                )
            
            if analysis['visible_inputs'] == 0 and analysis['input_count'] > 0:
                analysis['warnings'].append(
                    "All input fields are hidden - page may still be loading"
                )
            
            if not analysis['has_forms']:
                analysis['warnings'].append(
                    "No <form> elements found - may be a single-page app"
                )
            
            total_fillable = (
                analysis['visible_inputs'] + 
                analysis['textarea_count'] + 
                analysis['select_count']
            )
            
            # Check for Shadow DOM
            try:
                shadow_result = page.evaluate('''() => {
                    let shadowCount = 0;
                    let shadowInputs = 0;
                    
                    document.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) {
                            shadowCount++;
                            const inputs = el.shadowRoot.querySelectorAll('input, textarea, select');
                            shadowInputs += inputs.length;
                        }
                    });
                    
                    return { shadowCount, shadowInputs };
                }''')
                
                if shadow_result['shadowCount'] > 0:
                    analysis['has_shadow_dom'] = True
                    analysis['shadow_input_count'] = shadow_result['shadowInputs']
                    analysis['warnings'].append(
                        f"Page uses Shadow DOM with {shadow_result['shadowInputs']} inputs inside - "
                        "these cannot be accessed by standard automation"
                    )
            except Exception as e:
                logger.debug(f"Shadow DOM check failed: {e}")
            
            # Get page structure snapshot
            try:
                analysis['page_snapshot'] = page.evaluate('''() => {
                    const snapshot = {
                        hasForm: document.querySelector('form') !== null,
                        hasInputs: document.querySelectorAll('input').length,
                        hasTextareas: document.querySelectorAll('textarea').length,
                        hasSelects: document.querySelectorAll('select').length,
                        hasIframes: document.querySelectorAll('iframe').length,
                        bodyVisible: document.body && document.body.offsetHeight > 0,
                        firstFormId: document.querySelector('form')?.id || 'none'
                    };
                    return snapshot;
                }''')
            except:
                pass
            
            if total_fillable == 0:
                analysis['warnings'].append(
                    "No fillable fields detected - page may need interaction first"
                )
                
                # Additional specific warnings
                if analysis.get('shadow_input_count', 0) > 0:
                    analysis['warnings'].append(
                        "⚠️ CRITICAL: Form uses Shadow DOM - standard autofill cannot access these fields"
                    )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze page: {e}")
            return {
                'error': str(e),
                'warnings': ['Failed to analyze page structure']
            }
    
    @staticmethod
    def print_analysis(analysis):
        """Print human-readable analysis"""
        print("\n" + "="*60)
        print("PAGE ANALYSIS")
        print("="*60)
        print(f"URL: {analysis.get('url', 'Unknown')}")
        print(f"Title: {analysis.get('title', 'Unknown')}")
        print()
        
        print("FORM ELEMENTS:")
        print(f"  Input fields: {analysis.get('input_count', 0)} total")
        print(f"    • Visible: {analysis.get('visible_inputs', 0)}")
        print(f"    • Hidden: {analysis.get('hidden_inputs', 0)}")
        print(f"  Textareas: {analysis.get('textarea_count', 0)}")
        print(f"  Dropdowns: {analysis.get('select_count', 0)}")
        print(f"  Buttons: {analysis.get('button_count', 0)}")
        print()
        
        if analysis.get('input_types'):
            print("INPUT TYPES:")
            for input_type, count in analysis['input_types'].items():
                print(f"  • {input_type}: {count}")
            print()
        
        if analysis.get('iframe_count', 0) > 0:
            print(f"⚠️  IFRAMES: {analysis['iframe_count']} detected")
            print()
        
        if analysis.get('warnings'):
            print("⚠️  WARNINGS:")
            for warning in analysis['warnings']:
                print(f"  • {warning}")
            print()
        
        total_fillable = (
            analysis.get('visible_inputs', 0) + 
            analysis.get('textarea_count', 0) + 
            analysis.get('select_count', 0)
        )
        
        if total_fillable > 0:
            print(f"✓ {total_fillable} fillable fields detected")
        else:
            print("✗ No fillable fields detected")
        
        print("="*60 + "\n")
