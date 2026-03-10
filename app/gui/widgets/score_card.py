"""Score card widget for displaying scores"""
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont


class ScoreCard(QWidget):
    """Widget to display a score with label"""
    
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        self.title = title
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Title label
        self.title_label = QLabel(self.title)
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        font = QFont()
        font.setPointSize(10)
        self.title_label.setFont(font)
        
        # Score label
        self.score_label = QLabel("--")
        self.score_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        score_font = QFont()
        score_font.setPointSize(36)
        score_font.setBold(True)
        self.score_label.setFont(score_font)
        
        # Grade label
        self.grade_label = QLabel("")
        self.grade_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        layout.addWidget(self.title_label)
        layout.addWidget(self.score_label)
        layout.addWidget(self.grade_label)
        
        self.setLayout(layout)
        self.setMinimumHeight(150)
    
    def set_score(self, score: float, grade: str = ""):
        """Set the score value"""
        self.score_label.setText(f"{score:.1f}")
        self.grade_label.setText(grade)
        
        # Color coding
        if score >= 80:
            color = "#28a745"  # Green
        elif score >= 60:
            color = "#ffc107"  # Yellow
        else:
            color = "#dc3545"  # Red
        
        self.score_label.setStyleSheet(f"color: {color};")
        
        # Add background
        self.setStyleSheet(f"""
            ScoreCard {{
                background-color: #f8f9fa;
                border: 2px solid {color};
                border-radius: 10px;
                padding: 10px;
            }}
        """)
