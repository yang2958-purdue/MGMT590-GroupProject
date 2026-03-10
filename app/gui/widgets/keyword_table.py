"""Keyword table widget"""
from PySide6.QtWidgets import QTableWidget, QTableWidgetItem, QHeaderView
from PySide6.QtCore import Qt
from typing import List


class KeywordTable(QTableWidget):
    """Table widget for displaying keywords"""
    
    def __init__(self, title: str = "Keywords", parent=None):
        super().__init__(parent)
        self.title = title
        self.init_ui()
    
    def init_ui(self):
        self.setColumnCount(1)
        self.setHorizontalHeaderLabels([self.title])
        self.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.verticalHeader().setVisible(False)
        self.setAlternatingRowColors(True)
    
    def set_keywords(self, keywords: List[str], color: str = None):
        """Set keywords to display"""
        self.setRowCount(len(keywords))
        
        for i, keyword in enumerate(keywords):
            item = QTableWidgetItem(keyword)
            item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
            
            if color:
                item.setForeground(Qt.GlobalColor(color))
            
            self.setItem(i, 0, item)
