"""Jobs listing panel"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLineEdit,
    QTableWidget, QTableWidgetItem, QTextEdit, QLabel,
    QMessageBox, QHeaderView, QSplitter
)
from PySide6.QtCore import Qt, Signal, QThread
from typing import Optional, List
from app.application.services.job_fetch_service import JobFetchService
from app.domain.models import JobListing


class JobFetchWorker(QThread):
    """Worker thread for fetching jobs"""
    finished = Signal(list)
    error = Signal(str)
    
    def __init__(self, service, search="", location=""):
        super().__init__()
        self.service = service
        self.search = search
        self.location = location
    
    def run(self):
        try:
            jobs = self.service.fetch_jobs(self.search, self.location)
            self.finished.emit(jobs)
        except Exception as e:
            self.error.emit(str(e))


class JobsPanel(QWidget):
    """Panel for job listings and selection"""
    job_selected = Signal(object)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.service = JobFetchService()
        self.jobs: List[JobListing] = []
        self.selected_job: Optional[JobListing] = None
        self.worker = None
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Title
        title = QLabel("Job Listings")
        title.setStyleSheet("font-size: 18px; font-weight: bold;")
        layout.addWidget(title)
        
        # Search bar
        search_layout = QHBoxLayout()
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search jobs (e.g., 'Software Engineer', 'Data Scientist')...")
        self.search_input.returnPressed.connect(self.search_jobs)
        
        self.search_btn = QPushButton("🔍 Search")
        self.search_btn.clicked.connect(self.search_jobs)
        
        self.refresh_btn = QPushButton("🔄 Refresh")
        self.refresh_btn.clicked.connect(self.load_jobs)
        
        search_layout.addWidget(self.search_input)
        search_layout.addWidget(self.search_btn)
        search_layout.addWidget(self.refresh_btn)
        
        # Splitter for jobs list and details
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Jobs table
        self.jobs_table = QTableWidget()
        self.jobs_table.setColumnCount(3)
        self.jobs_table.setHorizontalHeaderLabels(["Title", "Company", "Location"])
        self.jobs_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.jobs_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.jobs_table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.jobs_table.itemSelectionChanged.connect(self.on_job_selection_changed)
        
        # Job details
        details_widget = QWidget()
        details_layout = QVBoxLayout()
        
        details_title = QLabel("Job Details")
        details_title.setStyleSheet("font-weight: bold;")
        
        self.job_details = QTextEdit()
        self.job_details.setReadOnly(True)
        self.job_details.setPlaceholderText("Select a job to view details...")
        
        self.select_btn = QPushButton("✓ Select This Job for Analysis")
        self.select_btn.clicked.connect(self.select_job)
        self.select_btn.setEnabled(False)
        self.select_btn.setStyleSheet("""
            QPushButton {
                background-color: #007bff;
                color: white;
                padding: 10px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #0056b3;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        
        details_layout.addWidget(details_title)
        details_layout.addWidget(self.job_details)
        details_layout.addWidget(self.select_btn)
        details_widget.setLayout(details_layout)
        
        splitter.addWidget(self.jobs_table)
        splitter.addWidget(details_widget)
        splitter.setSizes([400, 600])
        
        # Status label
        self.status_label = QLabel("Click 'Refresh' or 'Search' to load jobs")
        self.status_label.setStyleSheet("color: gray;")
        
        # Add to main layout
        layout.addLayout(search_layout)
        layout.addWidget(self.status_label)
        layout.addWidget(splitter)
        
        self.setLayout(layout)
    
    def load_jobs(self):
        """Load job listings"""
        self.search_jobs("")
    
    def search_jobs(self, query=None):
        """Search for jobs"""
        if query is None:
            query = self.search_input.text().strip()
        
        self.status_label.setText("Loading jobs...")
        self.search_btn.setEnabled(False)
        self.refresh_btn.setEnabled(False)
        
        # Fetch in background
        self.worker = JobFetchWorker(self.service, search=query)
        self.worker.finished.connect(self.on_jobs_loaded)
        self.worker.error.connect(self.on_error)
        self.worker.start()
    
    def on_jobs_loaded(self, jobs: List[JobListing]):
        """Handle loaded jobs"""
        self.jobs = jobs
        self.populate_table()
        self.status_label.setText(f"Found {len(jobs)} job(s)")
        self.search_btn.setEnabled(True)
        self.refresh_btn.setEnabled(True)
    
    def on_error(self, error_msg: str):
        """Handle error"""
        self.status_label.setText("Error loading jobs")
        self.search_btn.setEnabled(True)
        self.refresh_btn.setEnabled(True)
        QMessageBox.warning(self, "Error", f"Failed to load jobs:\n{error_msg}")
    
    def populate_table(self):
        """Populate jobs table"""
        self.jobs_table.setRowCount(len(self.jobs))
        
        for i, job in enumerate(self.jobs):
            self.jobs_table.setItem(i, 0, QTableWidgetItem(job.title))
            self.jobs_table.setItem(i, 1, QTableWidgetItem(job.company))
            self.jobs_table.setItem(i, 2, QTableWidgetItem(job.location))
    
    def on_job_selection_changed(self):
        """Handle job selection change"""
        selected_rows = self.jobs_table.selectedIndexes()
        if not selected_rows:
            return
        
        row = selected_rows[0].row()
        job = self.jobs[row]
        
        # Display job details
        details_html = f"""
        <h2>{job.title}</h2>
        <p><b>Company:</b> {job.company}</p>
        <p><b>Location:</b> {job.location}</p>
        <p><b>Employment Type:</b> {job.employment_type or 'Not specified'}</p>
        <p><b>Salary Range:</b> {job.salary_range or 'Not specified'}</p>
        
        <h3>Description:</h3>
        <p>{job.description}</p>
        
        <h3>Requirements:</h3>
        <ul>
        {''.join(f'<li>{req}</li>' for req in job.requirements)}
        </ul>
        
        <h3>Preferred Qualifications:</h3>
        <ul>
        {''.join(f'<li>{qual}</li>' for qual in job.preferred_qualifications)}
        </ul>
        
        <h3>Skills:</h3>
        <p>{', '.join(job.skills)}</p>
        """
        
        self.job_details.setHtml(details_html)
        self.select_btn.setEnabled(True)
    
    def select_job(self):
        """Select current job for analysis"""
        selected_rows = self.jobs_table.selectedIndexes()
        if not selected_rows:
            return
        
        row = selected_rows[0].row()
        self.selected_job = self.jobs[row]
        
        self.job_selected.emit(self.selected_job)
        QMessageBox.information(
            self,
            "Job Selected",
            f"Selected: {self.selected_job.title} at {self.selected_job.company}"
        )
    
    def get_selected_job(self) -> Optional[JobListing]:
        """Get currently selected job"""
        return self.selected_job
