"""Resume input panel"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QTextEdit,
    QLabel, QFileDialog, QMessageBox, QGroupBox
)
from PySide6.QtCore import Qt, Signal, QThread
from typing import Optional
from app.application.services.resume_ingestion_service import ResumeIngestionService
from app.domain.models import Resume


class ResumeWorker(QThread):
    """Worker thread for resume processing"""
    finished = Signal(object)
    error = Signal(str)
    
    def __init__(self, service, file_path=None, text=None):
        super().__init__()
        self.service = service
        self.file_path = file_path
        self.text = text
    
    def run(self):
        try:
            if self.file_path:
                resume = self.service.ingest_file(self.file_path)
            else:
                resume = self.service.ingest_text(self.text)
            self.finished.emit(resume)
        except Exception as e:
            self.error.emit(str(e))


class ResumePanel(QWidget):
    """Panel for resume input and preview"""
    resume_loaded = Signal(object)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.service = ResumeIngestionService()
        self.current_resume: Optional[Resume] = None
        self.worker = None
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Title
        title = QLabel("Resume Input")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)
        
        # Upload section
        upload_group = QGroupBox("Upload Resume File")
        upload_layout = QVBoxLayout()
        
        upload_info = QLabel("Supported formats: PDF, DOCX, TXT, JPG, PNG")
        upload_info.setStyleSheet("color: gray;")
        
        btn_layout = QHBoxLayout()
        self.upload_btn = QPushButton("📁 Upload File")
        self.upload_btn.clicked.connect(self.upload_file)
        btn_layout.addWidget(self.upload_btn)
        btn_layout.addStretch()
        
        self.file_label = QLabel("No file selected")
        
        upload_layout.addWidget(upload_info)
        upload_layout.addLayout(btn_layout)
        upload_layout.addWidget(self.file_label)
        upload_group.setLayout(upload_layout)
        
        # OR separator
        or_label = QLabel("— OR —")
        or_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        or_label.setStyleSheet("color: gray; margin: 10px;")
        
        # Paste section
        paste_group = QGroupBox("Paste Resume Text")
        paste_layout = QVBoxLayout()
        
        self.text_input = QTextEdit()
        self.text_input.setPlaceholderText("Paste your resume text here...")
        self.text_input.setMinimumHeight(150)
        
        self.parse_btn = QPushButton("Parse Text")
        self.parse_btn.clicked.connect(self.parse_text)
        
        paste_layout.addWidget(self.text_input)
        paste_layout.addWidget(self.parse_btn)
        paste_group.setLayout(paste_layout)
        
        # Extracted text preview
        preview_group = QGroupBox("Extracted Resume Text")
        preview_layout = QVBoxLayout()
        
        self.preview_text = QTextEdit()
        self.preview_text.setReadOnly(False)
        self.preview_text.setMinimumHeight(200)
        self.preview_text.setPlaceholderText("Extracted text will appear here...")
        
        preview_layout.addWidget(self.preview_text)
        preview_group.setLayout(preview_layout)
        
        # Parsed info
        info_group = QGroupBox("Parsed Information")
        info_layout = QVBoxLayout()
        
        self.info_label = QLabel("No resume loaded")
        self.info_label.setWordWrap(True)
        
        info_layout.addWidget(self.info_label)
        info_group.setLayout(info_layout)
        
        # Add all to main layout
        layout.addWidget(upload_group)
        layout.addWidget(or_label)
        layout.addWidget(paste_group)
        layout.addWidget(preview_group)
        layout.addWidget(info_group)
        layout.addStretch()
        
        self.setLayout(layout)
    
    def upload_file(self):
        """Handle file upload"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Resume File",
            "",
            "Resume Files (*.pdf *.docx *.txt *.jpg *.jpeg *.png);;All Files (*.*)"
        )
        
        if file_path:
            self.file_label.setText(f"Processing: {file_path}")
            self.upload_btn.setEnabled(False)
            
            # Process in background thread
            self.worker = ResumeWorker(self.service, file_path=file_path)
            self.worker.finished.connect(self.on_resume_loaded)
            self.worker.error.connect(self.on_error)
            self.worker.start()
    
    def parse_text(self):
        """Parse pasted text"""
        text = self.text_input.toPlainText().strip()
        
        if not text:
            QMessageBox.warning(self, "No Text", "Please paste resume text first")
            return
        
        self.parse_btn.setEnabled(False)
        
        # Process in background thread
        self.worker = ResumeWorker(self.service, text=text)
        self.worker.finished.connect(self.on_resume_loaded)
        self.worker.error.connect(self.on_error)
        self.worker.start()
    
    def on_resume_loaded(self, resume: Resume):
        """Handle successful resume loading"""
        self.current_resume = resume
        self.preview_text.setText(resume.cleaned_text)
        self.upload_btn.setEnabled(True)
        self.parse_btn.setEnabled(True)
        
        if resume.file_name:
            self.file_label.setText(f"✓ Loaded: {resume.file_name}")
        
        # Update info
        info_parts = []
        info_parts.append(f"<b>Sections Found:</b> {', '.join(resume.sections.keys())}")
        info_parts.append(f"<b>Skills Detected:</b> {len(resume.skills)}")
        if resume.skills:
            info_parts.append(f"  • {', '.join(resume.skills[:10])}")
        info_parts.append(f"<b>Experience Years:</b> {resume.experience_years or 'Not detected'}")
        if resume.education:
            info_parts.append(f"<b>Education:</b> {', '.join(resume.education)}")
        
        self.info_label.setText("<br>".join(info_parts))
        
        # Emit signal
        self.resume_loaded.emit(resume)
        
        QMessageBox.information(self, "Success", "Resume loaded successfully!")
    
    def on_error(self, error_msg: str):
        """Handle error"""
        self.upload_btn.setEnabled(True)
        self.parse_btn.setEnabled(True)
        self.file_label.setText("Error loading file")
        QMessageBox.critical(self, "Error", f"Failed to process resume:\n{error_msg}")
    
    def get_current_resume(self) -> Optional[Resume]:
        """Get current loaded resume"""
        return self.current_resume
