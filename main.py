#!/usr/bin/env python3
"""
Resume Compatibility Analyzer - Main Entry Point

A desktop application for analyzing resume compatibility with job listings
and optimizing resumes for ATS (Applicant Tracking System) compatibility.
"""
import sys
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from app.gui.main_window import MainWindow


def main():
    """Main application entry point"""
    # Enable High DPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    
    # Create application
    app = QApplication(sys.argv)
    app.setApplicationName("Resume Compatibility Analyzer")
    app.setOrganizationName("Resume Tools")
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    # Run application
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
