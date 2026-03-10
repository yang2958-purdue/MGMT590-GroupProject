"""
Test script to demonstrate the file browser functionality.
"""

from tkinter import Tk, filedialog

def test_file_browser():
    """Test the file browser dialog."""
    print("=" * 70)
    print("Testing File Browser")
    print("=" * 70)
    print("\nOpening file browser dialog...")
    print("(A file selection window should appear)")
    
    try:
        # Create hidden root window
        root = Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        # Open file dialog
        file_path = filedialog.askopenfilename(
            title="Select Resume File",
            filetypes=[
                ("Text files", "*.txt"),
                ("All files", "*.*")
            ],
            initialdir="."
        )
        
        # Clean up
        root.destroy()
        
        if file_path:
            print(f"\n[OK] File selected: {file_path}")
            return file_path
        else:
            print("\n[X] No file selected (dialog was cancelled)")
            return None
    
    except Exception as e:
        print(f"\n[X] Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("\nThis script will open a file browser dialog.")
    print("Select a file to test the functionality.")
    input("\nPress Enter to continue...")
    
    result = test_file_browser()
    
    print("\n" + "=" * 70)
    if result:
        print("File browser test PASSED")
    else:
        print("File browser test FAILED or cancelled")
    print("=" * 70)

