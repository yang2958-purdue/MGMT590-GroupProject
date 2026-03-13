"""Browser autofill panel"""
import logging
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLineEdit,
    QLabel, QMessageBox, QGroupBox, QTextEdit, QListWidget,
    QCheckBox, QProgressBar
)
from PySide6.QtCore import Qt, Signal, QThread
from typing import Optional
from app.application.services.form_autofill_service import FormAutofillService, AutofillResult
from app.domain.models import Resume
from app.config.settings import Settings

logger = logging.getLogger(__name__)


class AutofillWorker(QThread):
    """Worker thread for browser autofill"""
    finished = Signal(object)
    error = Signal(str)
    progress = Signal(str)
    cancelled = Signal()
    
    def __init__(self, service, resume, url, headless, pause_for_review, browser_client=None):
        super().__init__()
        self.service = service
        self.resume = resume
        self.url = url
        self.headless = headless
        self.pause_for_review = pause_for_review
        self.browser_client = browser_client  # Pre-existing browser
        self._is_cancelled = False
    
    def cancel(self):
        """Cancel the autofill operation"""
        self._is_cancelled = True
        self.progress.emit("Cancelling...")
        # Tell the service to cancel
        self.service.cancel()
    
    def run(self):
        try:
            if self._is_cancelled:
                self.cancelled.emit()
                return
            
            if self.browser_client:
                # Use existing browser (two-step workflow)
                self.progress.emit("Filling form fields...")
                result = self.service.autofill_existing_browser(
                    resume=self.resume,
                    browser_client=self.browser_client
                )
            else:
                # Old workflow - launch browser and autofill in one step
                self.progress.emit("Starting browser...")
                
                # Check for cancellation before starting
                if self._is_cancelled:
                    self.cancelled.emit()
                    return
                
                result = self.service.autofill_application(
                    resume=self.resume,
                    url=self.url,
                    headless=self.headless,
                    pause_for_review=self.pause_for_review
                )
            
            # Check if cancelled after completion
            if self._is_cancelled:
                self.cancelled.emit()
                return
            
            # Check if result indicates cancellation
            if "cancelled" in str(result.errors).lower():
                self.cancelled.emit()
                return
            
            self.finished.emit(result)
        except Exception as e:
            if self._is_cancelled or "cancelled" in str(e).lower():
                self.cancelled.emit()
            else:
                self.error.emit(str(e))


class AutofillPanel(QWidget):
    """Panel for browser-based form autofill"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.service = FormAutofillService()
        self.current_resume: Optional[Resume] = None
        self.worker = None
        self.browser_client = None  # Store browser instance
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Title
        title = QLabel("Browser Autofill")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)
        
        # Feature status
        if not Settings.ENABLE_BROWSER_AUTOFILL:
            warning = QLabel("⚠️ Browser autofill is disabled in settings")
            warning.setStyleSheet("color: #ff9800; padding: 10px; background-color: #3a3015; border-radius: 5px;")
            layout.addWidget(warning)
        
        # URL Input section
        url_group = QGroupBox("Application Form URL")
        url_layout = QVBoxLayout()
        
        url_input_layout = QHBoxLayout()
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Enter job application form URL (e.g., https://company.workdayjobs.com/...)")
        
        # Button container
        button_layout = QHBoxLayout()
        
        self.analyze_btn = QPushButton("🔍 Analyze Page")
        self.analyze_btn.clicked.connect(self.analyze_page)
        self.analyze_btn.setEnabled(False)
        self.analyze_btn.setStyleSheet("""
            QPushButton {
                background-color: #ff9800;
                color: white;
                padding: 10px 20px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #ffa726;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #707070;
            }
        """)
        
        self.launch_btn = QPushButton("🚀 Launch Browser")
        self.launch_btn.clicked.connect(self.launch_browser)
        self.launch_btn.setEnabled(False)
        self.launch_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196f3;
                color: white;
                padding: 10px 20px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #42a5f5;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #707070;
            }
        """)
        
        self.autofill_btn = QPushButton("🤖 Autofill Form")
        self.autofill_btn.clicked.connect(self.start_autofill)
        self.autofill_btn.setEnabled(False)
        self.autofill_btn.setStyleSheet("""
            QPushButton {
                background-color: #0d7377;
                color: white;
                padding: 10px 20px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #14ffec;
                color: #1e1e1e;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #707070;
            }
        """)
        
        self.close_btn = QPushButton("🔒 Close Browser")
        self.close_btn.clicked.connect(self.close_browser)
        self.close_btn.setEnabled(False)
        self.close_btn.setStyleSheet("""
            QPushButton {
                background-color: #d32f2f;
                color: white;
                padding: 10px 20px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #f44336;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #707070;
            }
        """)
        
        button_layout.addWidget(self.launch_btn)
        button_layout.addWidget(self.analyze_btn)
        button_layout.addWidget(self.autofill_btn)
        button_layout.addWidget(self.close_btn)
        
        url_input_layout.addWidget(self.url_input)
        url_input_layout.addLayout(button_layout)
        
        # Options
        options_layout = QHBoxLayout()
        
        self.headless_check = QCheckBox("Run in background (headless mode)")
        self.headless_check.setChecked(Settings.BROWSER_HEADLESS)
        self.headless_check.setToolTip("When checked, browser runs invisibly in background")
        
        self.pause_check = QCheckBox("Pause for review before closing")
        self.pause_check.setChecked(True)
        self.pause_check.setToolTip("Pause after filling to review the form")
        
        options_layout.addWidget(self.headless_check)
        options_layout.addWidget(self.pause_check)
        options_layout.addStretch()
        
        url_layout.addLayout(url_input_layout)
        url_layout.addLayout(options_layout)
        url_group.setLayout(url_layout)
        
        # Status section
        self.status_label = QLabel("Load a resume to enable autofill")
        self.status_label.setStyleSheet("color: #909090; padding: 10px;")
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)  # Indeterminate
        
        # Results section
        results_group = QGroupBox("Last Autofill Results")
        results_layout = QVBoxLayout()
        
        self.results_text = QTextEdit()
        self.results_text.setReadOnly(True)
        self.results_text.setMaximumHeight(200)
        self.results_text.setPlaceholderText("Results will appear here after autofill...")
        
        results_layout.addWidget(self.results_text)
        results_group.setLayout(results_layout)
        
        # Supported sites section
        sites_group = QGroupBox("Supported Application Platforms")
        sites_layout = QVBoxLayout()
        
        sites_info = QLabel(
            "✓ Generic HTML forms\n"
            "✓ Workday (myworkdayjobs.com)\n"
            "✓ Greenhouse (boards.greenhouse.io)\n"
            "✓ Lever (jobs.lever.co)\n"
            "✓ Taleo\n"
            "✓ iCIMS"
        )
        sites_info.setStyleSheet("color: #b0b0b0; padding: 10px;")
        
        sites_layout.addWidget(sites_info)
        sites_group.setLayout(sites_layout)
        
        # Instructions
        instructions = QLabel(
            "📋 <b>Two-Step Workflow (for authenticated forms):</b><br>"
            "1. Load a resume using the Resume Input tab<br>"
            "2. Enter the job application URL above<br>"
            "3. Click <b>'🚀 Launch Browser'</b> - Browser opens<br>"
            "4. <b>Manually login/authenticate</b> in the browser<br>"
            "5. Navigate to the application form<br>"
            "6. <b>(Optional)</b> Click <b>'🔍 Analyze Page'</b> - Check for fields<br>"
            "7. Click <b>'🤖 Autofill Form'</b> - Form fields filled<br>"
            "8. Review filled data and submit manually<br>"
            "9. Click <b>'🔒 Close Browser'</b> when done<br><br>"
            "💡 <b>Tip:</b> If autofill says 'no fields found', click 'Analyze Page' "
            "to see what's on the current page and get troubleshooting tips.<br><br>"
            "⚠️ <b>Note:</b> The application will NOT be auto-submitted. "
            "You must review and submit manually."
        )
        instructions.setWordWrap(True)
        instructions.setStyleSheet(
            "color: #e0e0e0; padding: 15px; background-color: #2d2d2d; "
            "border: 1px solid #404040; border-radius: 5px;"
        )
        
        # Add all to main layout
        layout.addWidget(url_group)
        layout.addWidget(self.status_label)
        layout.addWidget(self.progress_bar)
        layout.addWidget(results_group)
        layout.addWidget(sites_group)
        layout.addWidget(instructions)
        layout.addStretch()
        
        self.setLayout(layout)
    
    def set_resume(self, resume: Resume):
        """Set resume for autofill"""
        self.current_resume = resume
        self.update_button_state()
    
    def update_button_state(self):
        """Update button states based on current state"""
        has_resume = self.current_resume is not None
        feature_enabled = Settings.ENABLE_BROWSER_AUTOFILL
        browser_open = self.browser_client is not None
        
        # Launch button: enabled if have resume and no browser open
        self.launch_btn.setEnabled(has_resume and feature_enabled and not browser_open)
        
        # Analyze button: enabled if browser is open
        self.analyze_btn.setEnabled(browser_open)
        
        # Autofill button: enabled if browser is open
        self.autofill_btn.setEnabled(browser_open)
        
        # Close button: enabled if browser is open
        self.close_btn.setEnabled(browser_open)
        
        # Update status message
        if not feature_enabled:
            self.status_label.setText("Browser autofill is disabled in settings")
            self.status_label.setStyleSheet("color: #909090; padding: 10px;")
        elif not has_resume:
            self.status_label.setText("Load a resume to enable autofill")
            self.status_label.setStyleSheet("color: #909090; padding: 10px;")
        elif browser_open:
            self.status_label.setText("✓ Browser ready - Login if needed, then click 'Autofill Form'")
            self.status_label.setStyleSheet("color: #2196f3; padding: 10px;")
        else:
            self.status_label.setText(f"✓ Resume loaded: {self.current_resume.file_name or 'Pasted text'}")
            self.status_label.setStyleSheet("color: #4caf50; padding: 10px;")
    
    def launch_browser(self):
        """Launch browser and navigate to URL"""
        url = self.url_input.text().strip()
        
        if not url:
            QMessageBox.warning(self, "No URL", "Please enter an application form URL")
            return
        
        if not url.startswith('http'):
            url = 'https://' + url
        
        if not self.current_resume:
            QMessageBox.warning(self, "No Resume", "Please load a resume first")
            return
        
        try:
            # Import here to avoid circular dependency
            from app.infrastructure.browser.playwright_client import PlaywrightClient
            
            self.status_label.setText("Launching browser...")
            self.status_label.setStyleSheet("color: #ffc107; padding: 10px;")
            self.progress_bar.setVisible(True)
            
            # Create browser instance (not in context manager - we'll manage it manually)
            self.browser_client = PlaywrightClient(
                headless=self.headless_check.isChecked(),
                timeout=60000  # 60 second timeout
            )
            self.browser_client.start()
            
            # Navigate to URL
            if not self.browser_client.navigate(url):
                QMessageBox.warning(self, "Navigation Failed", f"Failed to navigate to:\n{url}")
                self.browser_client.close()
                self.browser_client = None
                self.progress_bar.setVisible(False)
                self.update_button_state()
                return
            
            self.progress_bar.setVisible(False)
            self.status_label.setText("✓ Browser launched - Please login/authenticate, then click 'Autofill Form'")
            self.status_label.setStyleSheet("color: #2196f3; padding: 10px;")
            
            # Update button states
            self.update_button_state()
            
            QMessageBox.information(
                self,
                "Browser Ready",
                "Browser launched successfully!\n\n"
                "Steps:\n"
                "1. Login/authenticate if required\n"
                "2. Navigate to the application form\n"
                "3. Click 'Autofill Form' button\n"
                "4. Review and submit manually\n"
                "5. Click 'Close Browser' when done"
            )
            
        except Exception as e:
            QMessageBox.critical(self, "Launch Failed", f"Failed to launch browser:\n\n{str(e)}")
            if self.browser_client:
                try:
                    self.browser_client.close()
                except:
                    pass
                self.browser_client = None
            self.progress_bar.setVisible(False)
            self.update_button_state()
    
    def analyze_page(self):
        """Analyze current page for debugging"""
        if not self.browser_client:
            QMessageBox.warning(self, "No Browser", "Please launch browser first")
            return
        
        try:
            from app.infrastructure.browser.page_analyzer import PageAnalyzer
            from app.infrastructure.browser.workday_helper import WorkdayHelper
            
            self.status_label.setText("Analyzing page...")
            self.status_label.setStyleSheet("color: #ffc107; padding: 10px;")
            
            # Check if it's Workday and run specialized diagnosis
            url = self.browser_client.page.url
            is_workday = 'workday' in url.lower()
            
            if is_workday:
                logger.info("Running Workday-specific diagnosis...")
                workday_diagnosis = WorkdayHelper.diagnose_workday_page(self.browser_client)
            
            # Analyze the page
            analysis = PageAnalyzer.analyze_page(self.browser_client)
            
            # Build report
            total_fillable = (
                analysis.get('visible_inputs', 0) +
                analysis.get('textarea_count', 0) +
                analysis.get('select_count', 0)
            )
            
            report = f"""
<h3>Page Analysis Results</h3>
<p><b>URL:</b> {analysis.get('url', 'Unknown')}</p>
<p><b>Title:</b> {analysis.get('title', 'Unknown')}</p>

<h4>Form Elements:</h4>
<ul>
<li>Input fields: {analysis.get('input_count', 0)} total ({analysis.get('visible_inputs', 0)} visible, {analysis.get('hidden_inputs', 0)} hidden)</li>
<li>Textareas: {analysis.get('textarea_count', 0)}</li>
<li>Dropdowns: {analysis.get('select_count', 0)}</li>
<li>Buttons: {analysis.get('button_count', 0)}</li>
<li>Iframes: {analysis.get('iframe_count', 0)}</li>
</ul>

<h4>Fillable Fields: {total_fillable}</h4>
"""
            
            if analysis.get('input_types'):
                report += "<h4>Input Types:</h4><ul>"
                for input_type, count in analysis['input_types'].items():
                    report += f"<li>{input_type}: {count}</li>"
                report += "</ul>"
            
            # Add Workday-specific diagnosis if available
            if is_workday and 'workday_diagnosis' in locals():
                report += "<h4 style='color: #2196f3;'>Workday Analysis:</h4>"
                report += f"<p>{workday_diagnosis.get('page_state', 'Analyzing...')}</p>"
                
                if workday_diagnosis.get('workday_elements', 0) > 0:
                    report += f"<p>Workday elements: {workday_diagnosis['workday_elements']}</p>"
                
                if workday_diagnosis.get('issues'):
                    report += "<p><b>Issues Detected:</b></p><ul>"
                    for issue in workday_diagnosis['issues']:
                        report += f"<li style='color: #ff9800;'>{issue}</li>"
                    report += "</ul>"
                
                if workday_diagnosis.get('suggestions'):
                    report += "<p><b>💡 Suggestions:</b></p><ul>"
                    for suggestion in workday_diagnosis['suggestions']:
                        report += f"<li style='color: #2196f3;'>{suggestion}</li>"
                    report += "</ul>"
            
            if analysis.get('warnings'):
                report += "<h4 style='color: #ff9800;'>⚠️ Warnings:</h4><ul>"
                for warning in analysis['warnings']:
                    report += f"<li style='color: #ff9800;'>{warning}</li>"
                report += "</ul>"
            
            if total_fillable > 0:
                report += f"<p style='color: #4caf50;'><b>✓ {total_fillable} fillable fields detected</b></p>"
            else:
                report += "<p style='color: #f44336;'><b>✗ No fillable fields detected</b></p>"
                report += """
<p><b>Troubleshooting:</b></p>
<ul>
<li>Wait for page to fully load</li>
<li>Check if fields are in an iframe (not accessible)</li>
<li>Try clicking/scrolling on the page first</li>
<li>Some forms load fields dynamically</li>
</ul>
"""
            
            self.results_text.setHtml(report)
            
            self.status_label.setText(f"Analysis complete: {total_fillable} fillable fields found")
            self.status_label.setStyleSheet("color: #2196f3; padding: 10px;")
            
            # Also show dialog with key info
            QMessageBox.information(
                self,
                "Page Analysis",
                f"Fillable Fields: {total_fillable}\n\n"
                f"Inputs: {analysis.get('visible_inputs', 0)} visible\n"
                f"Textareas: {analysis.get('textarea_count', 0)}\n"
                f"Dropdowns: {analysis.get('select_count', 0)}\n\n"
                f"{'⚠️ Warnings: ' + str(len(analysis.get('warnings', []))) if analysis.get('warnings') else '✓ No issues detected'}"
            )
            
        except Exception as e:
            QMessageBox.critical(self, "Analysis Failed", f"Failed to analyze page:\n\n{str(e)}")
            self.status_label.setText("Analysis failed")
            self.status_label.setStyleSheet("color: #f44336; padding: 10px;")
    
    def close_browser(self):
        """Close the browser"""
        if self.browser_client:
            try:
                self.browser_client.close()
            except Exception as e:
                logger.error(f"Error closing browser: {e}")
            finally:
                self.browser_client = None
                self.status_label.setText("Browser closed")
                self.status_label.setStyleSheet("color: #909090; padding: 10px;")
                self.update_button_state()
    
    def start_autofill(self):
        """Start the autofill process on already-open browser"""
        if not self.browser_client:
            QMessageBox.warning(self, "No Browser", "Please launch browser first")
            return
        
        if not self.current_resume:
            QMessageBox.warning(self, "No Resume", "Please load a resume first")
            return
        
        # Confirm with user
        reply = QMessageBox.question(
            self,
            "Start Autofill",
            "Fill form fields on current page?\n\n"
            "Make sure you are on the application form page.\n\n"
            "Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply != QMessageBox.StandardButton.Yes:
            return
        
        # Start autofill in background thread
        self.autofill_btn.setEnabled(False)
        self.launch_btn.setEnabled(False)
        self.close_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.status_label.setText("Filling form fields...")
        self.status_label.setStyleSheet("color: #ffc107; padding: 10px;")
        
        self.worker = AutofillWorker(
            self.service,
            self.current_resume,
            None,  # No URL needed - browser already open
            False,  # Not used
            False,  # Don't pause - user already in control
            self.browser_client  # Pass existing browser
        )
        self.worker.finished.connect(self.on_autofill_complete)
        self.worker.error.connect(self.on_autofill_error)
        self.worker.progress.connect(self.on_progress)
        self.worker.cancelled.connect(self.on_autofill_cancelled)
        self.worker.start()
    
    def on_progress(self, message: str):
        """Handle progress updates"""
        self.status_label.setText(message)
    
    def cancel_autofill(self):
        """Cancel the running autofill process"""
        if self.worker and self.worker.isRunning():
            # Disable cancel button immediately
            self.cancel_btn.setEnabled(False)
            self.status_label.setText("Cancelling autofill...")
            self.status_label.setStyleSheet("color: #ff9800; padding: 10px;")
            
            # Cancel in worker (this will force close the browser)
            self.worker.cancel()
            
            # Set a timeout to force cleanup if worker doesn't respond
            from PySide6.QtCore import QTimer
            QTimer.singleShot(3000, self._force_cancel_cleanup)
    
    def _force_cancel_cleanup(self):
        """Force cleanup if cancel is taking too long"""
        if self.worker and self.worker.isRunning():
            logger.warning("Forcing worker thread termination")
            try:
                self.worker.terminate()
                self.worker.wait(1000)
            except:
                pass
            
            # Update UI
            self.autofill_btn.setEnabled(True)
            self.cancel_btn.setVisible(False)
            self.cancel_btn.setEnabled(True)
            self.progress_bar.setVisible(False)
            self.status_label.setText("⚠ Autofill force cancelled")
            self.status_label.setStyleSheet("color: #ff9800; padding: 10px;")
    
    def on_autofill_cancelled(self):
        """Handle cancelled autofill"""
        # Ensure worker is stopped
        if self.worker and self.worker.isRunning():
            try:
                self.worker.quit()
                self.worker.wait(1000)
            except:
                pass
        
        self.progress_bar.setVisible(False)
        self.update_button_state()
        self.status_label.setText("⚠ Autofill cancelled by user")
        self.status_label.setStyleSheet("color: #ff9800; padding: 10px;")
        
        self.results_text.setHtml("<p style='color: #ff9800;'><b>Operation Cancelled</b><br>Autofill was cancelled by user.</p>")
    
    def on_autofill_complete(self, result: AutofillResult):
        """Handle completed autofill"""
        self.progress_bar.setVisible(False)
        self.update_button_state()
        
        # Display results
        results_text = f"""
<h3>Autofill {'Successful' if result.success else 'Failed'}</h3>
<p><b>URL:</b> {result.url}</p>
<p><b>Time:</b> {result.timestamp}</p>
<p><b>Fields Filled:</b> {result.fields_filled}</p>
<p><b>Fields Failed:</b> {result.fields_failed}</p>

<h4>Mapped Fields ({len(result.mappings)}):</h4>
<ul>
{"".join(f'<li>{m.resume_field} → {m.selector}</li>' for m in result.mappings[:10])}
</ul>

"""
        
        if result.errors:
            results_text += f"<h4>Errors ({len(result.errors)}):</h4><ul>"
            for error in result.errors[:5]:
                results_text += f"<li style='color: #f44336;'>{error}</li>"
            results_text += "</ul>"
        
        if result.screenshot_path:
            results_text += f"<p><b>Screenshot:</b> {result.screenshot_path}</p>"
        
        self.results_text.setHtml(results_text)
        
        # Update status
        if result.success:
            self.status_label.setText(
                f"✓ Autofill complete: {result.fields_filled} fields filled"
            )
            self.status_label.setStyleSheet("color: #4caf50; padding: 10px;")
            
            QMessageBox.information(
                self,
                "Autofill Complete",
                f"Successfully filled {result.fields_filled} fields.\n\n"
                "Please review the form in the browser and submit when ready."
            )
        else:
            self.status_label.setText("⚠ Autofill completed with errors")
            self.status_label.setStyleSheet("color: #ff9800; padding: 10px;")
            
            QMessageBox.warning(
                self,
                "Autofill Issues",
                f"Autofill completed but encountered issues:\n\n"
                f"Fields filled: {result.fields_filled}\n"
                f"Fields failed: {result.fields_failed}\n\n"
                f"Errors: {len(result.errors)}"
            )
    
    def on_autofill_error(self, error_msg: str):
        """Handle autofill error"""
        self.progress_bar.setVisible(False)
        self.update_button_state()
        self.status_label.setText("✗ Autofill failed")
        self.status_label.setStyleSheet("color: #f44336; padding: 10px;")
        
        self.results_text.setHtml(f"<p style='color: #f44336;'><b>Error:</b> {error_msg}</p>")
        
        QMessageBox.critical(
            self,
            "Autofill Failed",
            f"Autofill failed with error:\n\n{error_msg}"
        )
