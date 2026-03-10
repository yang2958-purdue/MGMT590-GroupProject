"""Loading overlay widget"""
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QProgressBar
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QPalette, QColor


class LoadingOverlay(QWidget):
    """Loading overlay with progress indicator"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()
        self.hide()
    
    def init_ui(self):
        # Semi-transparent background
        palette = self.palette()
        palette.setColor(QPalette.ColorRole.Window, QColor(0, 0, 0, 150))
        self.setAutoFillBackground(True)
        self.setPalette(palette)
        
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Loading label
        self.label = QLabel("Processing...")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setStyleSheet("color: white; font-size: 18px; font-weight: bold;")
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setRange(0, 0)  # Indeterminate
        self.progress.setMaximumWidth(300)
        
        layout.addWidget(self.label)
        layout.addWidget(self.progress)
        
        self.setLayout(layout)
    
    def show_loading(self, message: str = "Processing..."):
        """Show loading overlay with message"""
        self.label.setText(message)
        self.show()
        self.raise_()
    
    def hide_loading(self):
        """Hide loading overlay"""
        self.hide()
