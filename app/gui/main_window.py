"""Main application window"""
from PySide6.QtWidgets import (
    QMainWindow, QTabWidget, QWidget, QVBoxLayout, QStatusBar,
    QMenuBar, QMessageBox
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QAction
from app.gui.resume_panel import ResumePanel
from app.gui.jobs_panel import JobsPanel
from app.gui.analysis_panel import AnalysisPanel
from app.gui.optimization_panel import OptimizationPanel
from app.gui.autofill_panel import AutofillPanel
from app.config.settings import Settings


class MainWindow(QMainWindow):
    """Main application window with tabbed interface"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
        self.connect_signals()
    
    def init_ui(self):
        """Initialize the UI"""
        self.setWindowTitle(f"{Settings.APP_NAME} v{Settings.APP_VERSION}")
        self.setGeometry(100, 100, 1400, 900)
        
        # Create menu bar
        self.create_menu_bar()
        
        # Create tab widget
        self.tabs = QTabWidget()
        self.tabs.setTabPosition(QTabWidget.TabPosition.North)
        
        # Create panels
        self.resume_panel = ResumePanel()
        self.jobs_panel = JobsPanel()
        self.analysis_panel = AnalysisPanel()
        self.optimization_panel = OptimizationPanel()
        self.autofill_panel = AutofillPanel()
        
        # Add tabs
        self.tabs.addTab(self.resume_panel, "📄 Resume Input")
        self.tabs.addTab(self.jobs_panel, "💼 Job Listings")
        self.tabs.addTab(self.analysis_panel, "📊 Analysis Results")
        self.tabs.addTab(self.optimization_panel, "✨ Resume Optimization")
        self.tabs.addTab(self.autofill_panel, "🤖 Browser Autofill")
        
        # Set central widget
        self.setCentralWidget(self.tabs)
        
        # Create status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")
        
        # Dark theme style
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1e1e1e;
                color: #e0e0e0;
            }
            QWidget {
                background-color: #1e1e1e;
                color: #e0e0e0;
            }
            QTabWidget::pane {
                border: 1px solid #404040;
                background-color: #2d2d2d;
            }
            QTabBar::tab {
                background-color: #252525;
                color: #b0b0b0;
                padding: 10px 20px;
                margin-right: 2px;
                border: 1px solid #404040;
                border-bottom: none;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
            }
            QTabBar::tab:selected {
                background-color: #2d2d2d;
                color: #ffffff;
                font-weight: bold;
                border-bottom: 2px solid #0d7377;
            }
            QTabBar::tab:hover {
                background-color: #353535;
                color: #ffffff;
            }
            QLabel {
                color: #e0e0e0;
                background-color: transparent;
            }
            QPushButton {
                background-color: #0d7377;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #14ffec;
                color: #1e1e1e;
            }
            QPushButton:pressed {
                background-color: #0a5255;
            }
            QPushButton:disabled {
                background-color: #404040;
                color: #707070;
            }
            QTextEdit, QLineEdit {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #404040;
                border-radius: 4px;
                padding: 5px;
                selection-background-color: #0d7377;
            }
            QTextEdit:focus, QLineEdit:focus {
                border: 1px solid #14ffec;
            }
            QTableWidget {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #404040;
                gridline-color: #404040;
                selection-background-color: #0d7377;
            }
            QTableWidget::item {
                padding: 5px;
            }
            QTableWidget::item:selected {
                background-color: #0d7377;
                color: white;
            }
            QHeaderView::section {
                background-color: #252525;
                color: #e0e0e0;
                padding: 5px;
                border: 1px solid #404040;
                font-weight: bold;
            }
            QListWidget {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #404040;
                border-radius: 4px;
            }
            QListWidget::item {
                padding: 5px;
            }
            QListWidget::item:selected {
                background-color: #0d7377;
            }
            QGroupBox {
                color: #e0e0e0;
                border: 2px solid #404040;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
                font-weight: bold;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px;
            }
            QScrollBar:vertical {
                background-color: #2d2d2d;
                width: 12px;
                border: none;
            }
            QScrollBar::handle:vertical {
                background-color: #505050;
                border-radius: 6px;
                min-height: 20px;
            }
            QScrollBar::handle:vertical:hover {
                background-color: #606060;
            }
            QScrollBar:horizontal {
                background-color: #2d2d2d;
                height: 12px;
                border: none;
            }
            QScrollBar::handle:horizontal {
                background-color: #505050;
                border-radius: 6px;
                min-width: 20px;
            }
            QScrollBar::handle:horizontal:hover {
                background-color: #606060;
            }
            QStatusBar {
                background-color: #252525;
                color: #b0b0b0;
            }
            QMenuBar {
                background-color: #252525;
                color: #e0e0e0;
            }
            QMenuBar::item:selected {
                background-color: #0d7377;
            }
            QMenu {
                background-color: #2d2d2d;
                color: #e0e0e0;
                border: 1px solid #404040;
            }
            QMenu::item:selected {
                background-color: #0d7377;
            }
            QMessageBox {
                background-color: #2d2d2d;
            }
            QMessageBox QLabel {
                color: #e0e0e0;
            }
        """)
    
    def create_menu_bar(self):
        """Create menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("&File")
        
        new_action = QAction("&New Analysis", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_analysis)
        file_menu.addAction(new_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("&Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Help menu
        help_menu = menubar.addMenu("&Help")
        
        about_action = QAction("&About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
        
        settings_action = QAction("&Settings", self)
        settings_action.triggered.connect(self.show_settings)
        help_menu.addAction(settings_action)
    
    def connect_signals(self):
        """Connect signals between panels"""
        # When resume is loaded, pass it to analysis and optimization panels
        self.resume_panel.resume_loaded.connect(self.on_resume_loaded)
        
        # When job is selected, pass it to analysis and optimization panels
        self.jobs_panel.job_selected.connect(self.on_job_selected)
    
    def on_resume_loaded(self, resume):
        """Handle resume loaded event"""
        self.analysis_panel.set_resume(resume)
        self.optimization_panel.set_resume(resume)
        self.autofill_panel.set_resume(resume)
        self.status_bar.showMessage("Resume loaded successfully", 3000)
    
    def on_job_selected(self, job):
        """Handle job selected event"""
        self.analysis_panel.set_job(job)
        self.optimization_panel.set_job(job)
        self.status_bar.showMessage(f"Job selected: {job.title}", 3000)
        
        # Auto-switch to analysis tab
        self.tabs.setCurrentWidget(self.analysis_panel)
    
    def new_analysis(self):
        """Start a new analysis"""
        reply = QMessageBox.question(
            self,
            "New Analysis",
            "This will clear the current analysis. Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # Switch to resume tab
            self.tabs.setCurrentWidget(self.resume_panel)
            self.status_bar.showMessage("Start a new analysis by loading a resume")
    
    def show_about(self):
        """Show about dialog"""
        about_text = f"""
        <h2>{Settings.APP_NAME}</h2>
        <p>Version {Settings.APP_VERSION}</p>
        <p>A desktop application for analyzing resume compatibility with job listings 
        and optimizing resumes for ATS systems.</p>
        <p><b>Features:</b></p>
        <ul>
            <li>Resume parsing from multiple formats (PDF, DOCX, TXT, Images)</li>
            <li>Job compatibility scoring</li>
            <li>ATS-friendly resume evaluation</li>
            <li>AI-powered resume optimization</li>
        </ul>
        <p><b>Tech Stack:</b> Python, PySide6, scikit-learn, pytesseract</p>
        """
        
        QMessageBox.about(self, "About", about_text)
    
    def show_settings(self):
        """Show settings dialog"""
        settings_text = f"""
        <h3>Current Settings</h3>
        <p><b>AI Provider:</b> {"Agentic" if Settings.USE_AGENTIC_ANALYSIS else "Local"}</p>
        <p><b>OCR Mode:</b> {"Remote API" if Settings.USE_REMOTE_OCR else "Local Tesseract"}</p>
        <p><b>Browser Autofill:</b> {"Enabled" if Settings.ENABLE_BROWSER_AUTOFILL else "Disabled"}</p>
        <p><b>Browser Mode:</b> {"Headless" if Settings.BROWSER_HEADLESS else "Visible"}</p>
        <p><b>Jobs API:</b> {Settings.JOBS_API_BASE_URL}</p>
        <p><b>Agent API:</b> {Settings.AGENT_API_BASE_URL}</p>
        <br>
        <p><i>To change settings, edit environment variables or the settings.py file.</i></p>
        """
        
        QMessageBox.information(self, "Settings", settings_text)
    
    def closeEvent(self, event):
        """Handle window close event"""
        reply = QMessageBox.question(
            self,
            "Exit",
            "Are you sure you want to exit?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            event.accept()
        else:
            event.ignore()
