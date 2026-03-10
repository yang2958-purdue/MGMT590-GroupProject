"""Analysis results panel"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel,
    QMessageBox, QScrollArea, QGroupBox, QListWidget, QSplitter
)
from PySide6.QtCore import Qt, Signal, QThread
from typing import Optional
from app.gui.widgets.score_card import ScoreCard
from app.application.services.compatibility_service import CompatibilityService
from app.domain.models import Resume, JobListing, AnalysisResult


class AnalysisWorker(QThread):
    """Worker thread for analysis"""
    finished = Signal(object)
    error = Signal(str)
    
    def __init__(self, service, resume, job):
        super().__init__()
        self.service = service
        self.resume = resume
        self.job = job
    
    def run(self):
        try:
            result = self.service.analyze(self.resume, self.job)
            self.finished.emit(result)
        except Exception as e:
            self.error.emit(str(e))


class AnalysisPanel(QWidget):
    """Panel for displaying analysis results"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.service = CompatibilityService()
        self.current_resume: Optional[Resume] = None
        self.current_job: Optional[JobListing] = None
        self.current_result: Optional[AnalysisResult] = None
        self.worker = None
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Title
        title = QLabel("Compatibility Analysis")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)
        
        # Analyze button
        btn_layout = QHBoxLayout()
        self.analyze_btn = QPushButton("🔍 Analyze Compatibility")
        self.analyze_btn.clicked.connect(self.run_analysis)
        self.analyze_btn.setEnabled(False)
        self.analyze_btn.setStyleSheet("""
            QPushButton {
                background-color: #28a745;
                color: white;
                padding: 15px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #218838;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        btn_layout.addWidget(self.analyze_btn)
        btn_layout.addStretch()
        
        self.status_label = QLabel("Load a resume and select a job to analyze")
        self.status_label.setStyleSheet("color: gray;")
        
        # Scroll area for results
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        
        # Results widget
        results_widget = QWidget()
        results_layout = QVBoxLayout()
        
        # Score cards
        scores_layout = QHBoxLayout()
        self.compatibility_card = ScoreCard("Compatibility Score")
        self.ats_card = ScoreCard("ATS Score")
        scores_layout.addWidget(self.compatibility_card)
        scores_layout.addWidget(self.ats_card)
        
        # Component scores
        component_group = QGroupBox("Component Scores")
        component_layout = QVBoxLayout()
        self.component_labels = {}
        
        for component in ["Keyword Match", "Skill Match", "Semantic Relevance", 
                         "Experience Match", "Education Match"]:
            label = QLabel(f"{component}: --")
            self.component_labels[component] = label
            component_layout.addWidget(label)
        
        component_group.setLayout(component_layout)
        
        # Splitter for keywords and recommendations
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Matched/Missing keywords
        keywords_widget = QWidget()
        keywords_layout = QVBoxLayout()
        
        matched_label = QLabel("✓ Matched Keywords")
        matched_label.setStyleSheet("font-weight: bold; color: green;")
        self.matched_list = QListWidget()
        
        missing_label = QLabel("✗ Missing Keywords")
        missing_label.setStyleSheet("font-weight: bold; color: red;")
        self.missing_list = QListWidget()
        
        keywords_layout.addWidget(matched_label)
        keywords_layout.addWidget(self.matched_list)
        keywords_layout.addWidget(missing_label)
        keywords_layout.addWidget(self.missing_list)
        keywords_widget.setLayout(keywords_layout)
        
        # Skills and recommendations
        right_widget = QWidget()
        right_layout = QVBoxLayout()
        
        skills_group = QGroupBox("Skills Analysis")
        skills_layout = QVBoxLayout()
        
        matched_skills_label = QLabel("✓ Matched Skills")
        matched_skills_label.setStyleSheet("font-weight: bold; color: green;")
        self.matched_skills_list = QListWidget()
        
        missing_skills_label = QLabel("✗ Missing Skills")
        missing_skills_label.setStyleSheet("font-weight: bold; color: red;")
        self.missing_skills_list = QListWidget()
        
        skills_layout.addWidget(matched_skills_label)
        skills_layout.addWidget(self.matched_skills_list)
        skills_layout.addWidget(missing_skills_label)
        skills_layout.addWidget(self.missing_skills_list)
        skills_group.setLayout(skills_layout)
        
        # Recommendations
        rec_group = QGroupBox("📋 Recommendations")
        rec_layout = QVBoxLayout()
        self.recommendations_list = QListWidget()
        rec_layout.addWidget(self.recommendations_list)
        rec_group.setLayout(rec_layout)
        
        # ATS Analysis
        ats_group = QGroupBox("ATS Analysis")
        ats_layout = QVBoxLayout()
        
        strengths_label = QLabel("✓ Strengths")
        strengths_label.setStyleSheet("font-weight: bold; color: green;")
        self.ats_strengths_list = QListWidget()
        
        warnings_label = QLabel("⚠ Warnings")
        warnings_label.setStyleSheet("font-weight: bold; color: orange;")
        self.ats_warnings_list = QListWidget()
        
        ats_layout.addWidget(strengths_label)
        ats_layout.addWidget(self.ats_strengths_list)
        ats_layout.addWidget(warnings_label)
        ats_layout.addWidget(self.ats_warnings_list)
        ats_group.setLayout(ats_layout)
        
        right_layout.addWidget(skills_group)
        right_layout.addWidget(rec_group)
        right_layout.addWidget(ats_group)
        right_widget.setLayout(right_layout)
        
        splitter.addWidget(keywords_widget)
        splitter.addWidget(right_widget)
        splitter.setSizes([500, 500])
        
        # Add all to results layout
        results_layout.addLayout(scores_layout)
        results_layout.addWidget(component_group)
        results_layout.addWidget(splitter)
        results_layout.addStretch()
        
        results_widget.setLayout(results_layout)
        scroll.setWidget(results_widget)
        
        # Add to main layout
        layout.addLayout(btn_layout)
        layout.addWidget(self.status_label)
        layout.addWidget(scroll)
        
        self.setLayout(layout)
    
    def set_resume(self, resume: Resume):
        """Set resume for analysis"""
        self.current_resume = resume
        self.update_button_state()
    
    def set_job(self, job: JobListing):
        """Set job for analysis"""
        self.current_job = job
        self.update_button_state()
    
    def update_button_state(self):
        """Update analyze button state"""
        if self.current_resume and self.current_job:
            self.analyze_btn.setEnabled(True)
            self.status_label.setText(
                f"Ready to analyze resume against: {self.current_job.title}"
            )
        else:
            self.analyze_btn.setEnabled(False)
            if not self.current_resume:
                self.status_label.setText("Please load a resume first")
            elif not self.current_job:
                self.status_label.setText("Please select a job")
    
    def run_analysis(self):
        """Run compatibility analysis"""
        if not self.current_resume or not self.current_job:
            QMessageBox.warning(
                self, "Missing Data",
                "Please load a resume and select a job first"
            )
            return
        
        self.analyze_btn.setEnabled(False)
        self.status_label.setText("Analyzing...")
        
        # Run in background
        self.worker = AnalysisWorker(
            self.service,
            self.current_resume,
            self.current_job
        )
        self.worker.finished.connect(self.on_analysis_complete)
        self.worker.error.connect(self.on_error)
        self.worker.start()
    
    def on_analysis_complete(self, result: AnalysisResult):
        """Display analysis results"""
        self.current_result = result
        self.analyze_btn.setEnabled(True)
        self.status_label.setText("Analysis complete!")
        
        # Update score cards
        self.compatibility_card.set_score(
            result.compatibility_score,
            result.get_compatibility_grade()
        )
        self.ats_card.set_score(
            result.ats_score,
            result.get_ats_grade()
        )
        
        # Update component scores
        self.component_labels["Keyword Match"].setText(
            f"Keyword Match: {result.keyword_score:.1f}"
        )
        self.component_labels["Skill Match"].setText(
            f"Skill Match: {result.skills_score:.1f}"
        )
        self.component_labels["Semantic Relevance"].setText(
            f"Semantic Relevance: {result.semantic_score:.1f}"
        )
        self.component_labels["Experience Match"].setText(
            f"Experience Match: {result.experience_score:.1f}"
        )
        self.component_labels["Education Match"].setText(
            f"Education Match: {result.education_score:.1f}"
        )
        
        # Update keywords
        self.matched_list.clear()
        self.matched_list.addItems(result.matched_keywords)
        self.missing_list.clear()
        self.missing_list.addItems(result.missing_keywords)
        
        # Update skills
        self.matched_skills_list.clear()
        self.matched_skills_list.addItems(result.matched_skills)
        self.missing_skills_list.clear()
        self.missing_skills_list.addItems(result.missing_skills)
        
        # Update recommendations
        self.recommendations_list.clear()
        self.recommendations_list.addItems(result.recommendations)
        
        # Update ATS analysis
        self.ats_strengths_list.clear()
        self.ats_strengths_list.addItems(result.ats_strengths)
        self.ats_warnings_list.clear()
        self.ats_warnings_list.addItems(result.ats_warnings)
        
        QMessageBox.information(
            self,
            "Analysis Complete",
            f"Compatibility Score: {result.compatibility_score:.1f}\n"
            f"ATS Score: {result.ats_score:.1f}"
        )
    
    def on_error(self, error_msg: str):
        """Handle error"""
        self.analyze_btn.setEnabled(True)
        self.status_label.setText("Analysis failed")
        QMessageBox.critical(self, "Error", f"Analysis failed:\n{error_msg}")
    
    def get_current_result(self) -> Optional[AnalysisResult]:
        """Get current analysis result"""
        return self.current_result
