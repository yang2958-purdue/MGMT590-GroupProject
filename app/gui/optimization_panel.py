"""Resume optimization panel"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QTextEdit,
    QLabel, QMessageBox, QSplitter, QFileDialog, QGroupBox, QListWidget
)
from PySide6.QtCore import Qt, Signal, QThread
from typing import Optional
from app.application.services.optimization_service import OptimizationService
from app.domain.models import Resume, JobListing, OptimizationResult


class OptimizationWorker(QThread):
    """Worker thread for optimization"""
    finished = Signal(object)
    error = Signal(str)
    
    def __init__(self, service, resume, job):
        super().__init__()
        self.service = service
        self.resume = resume
        self.job = job
    
    def run(self):
        try:
            result = self.service.optimize(self.resume, self.job)
            self.finished.emit(result)
        except Exception as e:
            self.error.emit(str(e))


class OptimizationPanel(QWidget):
    """Panel for resume optimization"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.service = OptimizationService()
        self.current_resume: Optional[Resume] = None
        self.current_job: Optional[JobListing] = None
        self.current_result: Optional[OptimizationResult] = None
        self.worker = None
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Title
        title = QLabel("Resume Optimization")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)
        
        # Control buttons
        btn_layout = QHBoxLayout()
        
        self.optimize_btn = QPushButton("✨ Generate Optimized Resume")
        self.optimize_btn.clicked.connect(self.optimize_resume)
        self.optimize_btn.setEnabled(False)
        self.optimize_btn.setStyleSheet("""
            QPushButton {
                background-color: #6f42c1;
                color: white;
                padding: 15px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #5a32a3;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        
        self.export_btn = QPushButton("💾 Export Optimized Resume")
        self.export_btn.clicked.connect(self.export_resume)
        self.export_btn.setEnabled(False)
        
        self.copy_btn = QPushButton("📋 Copy to Clipboard")
        self.copy_btn.clicked.connect(self.copy_to_clipboard)
        self.copy_btn.setEnabled(False)
        
        btn_layout.addWidget(self.optimize_btn)
        btn_layout.addWidget(self.export_btn)
        btn_layout.addWidget(self.copy_btn)
        btn_layout.addStretch()
        
        self.status_label = QLabel("Load a resume and select a job to optimize")
        self.status_label.setStyleSheet("color: gray;")
        
        # Splitter for original and optimized
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Original resume
        original_widget = QWidget()
        original_layout = QVBoxLayout()
        
        original_title = QLabel("Original Resume")
        original_title.setStyleSheet("font-weight: bold; font-size: 14px;")
        
        self.original_text = QTextEdit()
        self.original_text.setReadOnly(True)
        self.original_text.setPlaceholderText("Original resume will appear here...")
        
        original_layout.addWidget(original_title)
        original_layout.addWidget(self.original_text)
        original_widget.setLayout(original_layout)
        
        # Optimized resume
        optimized_widget = QWidget()
        optimized_layout = QVBoxLayout()
        
        optimized_title = QLabel("Optimized Resume")
        optimized_title.setStyleSheet("font-weight: bold; font-size: 14px;")
        
        self.optimized_text = QTextEdit()
        self.optimized_text.setReadOnly(False)  # Allow editing
        self.optimized_text.setPlaceholderText("Optimized resume will appear here...")
        
        optimized_layout.addWidget(optimized_title)
        optimized_layout.addWidget(self.optimized_text)
        optimized_widget.setLayout(optimized_layout)
        
        splitter.addWidget(original_widget)
        splitter.addWidget(optimized_widget)
        splitter.setSizes([500, 500])
        
        # Changes summary
        changes_group = QGroupBox("Changes & Recommendations")
        changes_layout = QVBoxLayout()
        
        self.changes_list = QListWidget()
        self.changes_list.setMaximumHeight(150)
        
        changes_layout.addWidget(self.changes_list)
        changes_group.setLayout(changes_layout)
        
        # Disclaimer
        disclaimer = QLabel(
            "⚠️ <b>Important:</b> Optimization suggestions are AI-generated estimates. "
            "Please review and verify all changes for accuracy before using the optimized resume."
        )
        disclaimer.setWordWrap(True)
        disclaimer.setStyleSheet("color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 5px;")
        
        # Add to main layout
        layout.addLayout(btn_layout)
        layout.addWidget(self.status_label)
        layout.addWidget(disclaimer)
        layout.addWidget(splitter)
        layout.addWidget(changes_group)
        
        self.setLayout(layout)
    
    def set_resume(self, resume: Resume):
        """Set resume for optimization"""
        self.current_resume = resume
        self.original_text.setText(resume.cleaned_text)
        self.update_button_state()
    
    def set_job(self, job: JobListing):
        """Set job for optimization"""
        self.current_job = job
        self.update_button_state()
    
    def update_button_state(self):
        """Update button states"""
        if self.current_resume and self.current_job:
            self.optimize_btn.setEnabled(True)
            self.status_label.setText(
                f"Ready to optimize for: {self.current_job.title}"
            )
        else:
            self.optimize_btn.setEnabled(False)
            if not self.current_resume:
                self.status_label.setText("Please load a resume first")
            elif not self.current_job:
                self.status_label.setText("Please select a job")
    
    def optimize_resume(self):
        """Generate optimized resume"""
        if not self.current_resume or not self.current_job:
            QMessageBox.warning(
                self, "Missing Data",
                "Please load a resume and select a job first"
            )
            return
        
        self.optimize_btn.setEnabled(False)
        self.status_label.setText("Optimizing resume...")
        
        # Run in background
        self.worker = OptimizationWorker(
            self.service,
            self.current_resume,
            self.current_job
        )
        self.worker.finished.connect(self.on_optimization_complete)
        self.worker.error.connect(self.on_error)
        self.worker.start()
    
    def on_optimization_complete(self, result: OptimizationResult):
        """Display optimization results"""
        self.current_result = result
        self.optimize_btn.setEnabled(True)
        self.export_btn.setEnabled(True)
        self.copy_btn.setEnabled(True)
        self.status_label.setText("Optimization complete!")
        
        # Display optimized text
        self.optimized_text.setText(result.optimized_resume_text)
        
        # Display changes
        self.changes_list.clear()
        
        if result.changes_summary:
            self.changes_list.addItems([f"✓ {change}" for change in result.changes_summary])
        
        if result.improvements:
            self.changes_list.addItem("")
            self.changes_list.addItem("💡 Suggested Improvements:")
            self.changes_list.addItems([f"  • {imp}" for imp in result.improvements])
        
        if result.warnings:
            self.changes_list.addItem("")
            self.changes_list.addItem("⚠️ Notes:")
            self.changes_list.addItems([f"  • {warning}" for warning in result.warnings])
        
        QMessageBox.information(
            self,
            "Optimization Complete",
            f"Resume optimized with {len(result.changes_summary)} changes.\n"
            "Please review the optimized version on the right."
        )
    
    def on_error(self, error_msg: str):
        """Handle error"""
        self.optimize_btn.setEnabled(True)
        self.status_label.setText("Optimization failed")
        QMessageBox.critical(self, "Error", f"Optimization failed:\n{error_msg}")
    
    def export_resume(self):
        """Export optimized resume to file"""
        if not self.current_result:
            return
        
        file_path, selected_filter = QFileDialog.getSaveFileName(
            self,
            "Export Optimized Resume",
            "optimized_resume.txt",
            "Text Files (*.txt);;All Files (*.*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.optimized_text.toPlainText())
                QMessageBox.information(
                    self, "Success",
                    f"Resume exported to:\n{file_path}"
                )
            except Exception as e:
                QMessageBox.critical(
                    self, "Error",
                    f"Failed to export resume:\n{str(e)}"
                )
    
    def copy_to_clipboard(self):
        """Copy optimized resume to clipboard"""
        from PySide6.QtGui import QGuiApplication
        
        clipboard = QGuiApplication.clipboard()
        clipboard.setText(self.optimized_text.toPlainText())
        
        QMessageBox.information(
            self, "Copied",
            "Optimized resume copied to clipboard!"
        )
