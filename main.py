"""
Main CLI application for Resume Auto-Fill Bot.
Provides interactive menu for resume analysis and job matching.
"""

import sys
from typing import List, Dict, Tuple, Optional
from resume_parser import ResumeParser
from job_search import JobSearcher
from similarity import SimilarityCalculator
from exporter import ResumeExporter
from utils import parse_company_list

# Import file dialog for file browsing
try:
    from tkinter import Tk, filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False


class ResumeAutoFillBot:
    """
    Main application class for the Resume Auto-Fill Bot CLI.
    """
    
    def __init__(self):
        self.resume_parser = ResumeParser()
        self.job_searcher = JobSearcher()
        self.similarity_calc = SimilarityCalculator()
        self.exporter = ResumeExporter()
        
        # Session state
        self.companies: List[str] = []
        self.role: str = ""
        self.jobs: List[Dict[str, str]] = []
        self.ranked_jobs: List[Tuple[Dict[str, str], float]] = []
    
    def display_banner(self):
        """Display application banner."""
        print("\n" + "=" * 70)
        print(" " * 20 + "RESUME AUTO-FILL BOT")
        print("=" * 70)
        print("A minimal CLI tool for matching your resume to job postings")
        print("=" * 70 + "\n")
    
    def display_menu(self):
        """Display main menu options."""
        print("\n" + "-" * 70)
        print("MAIN MENU")
        print("-" * 70)
        print("1. Upload or paste resume")
        print("2. Enter target companies")
        print("3. Enter desired role")
        print("4. Run job search")
        print("5. View ranked results")
        print("6. Export tailored resume")
        print("7. View current session info")
        print("8. Clear session and start over")
        print("9. Exit")
        print("-" * 70)
    
    def display_session_info(self):
        """Display current session information."""
        print("\n" + "-" * 70)
        print("CURRENT SESSION INFO")
        print("-" * 70)
        
        # Resume status
        if self.resume_parser.is_loaded():
            print(f"[OK] Resume: Loaded ({self.resume_parser.get_word_count()} words)")
        else:
            print("[  ] Resume: Not loaded")
        
        # Companies
        if self.companies:
            print(f"[OK] Companies: {', '.join(self.companies)}")
        else:
            print("[  ] Companies: Not set")
        
        # Role
        if self.role:
            print(f"[OK] Role: {self.role}")
        else:
            print("[  ] Role: Not set")
        
        # Search results
        if self.ranked_jobs:
            print(f"[OK] Search Results: {len(self.ranked_jobs)} jobs found and ranked")
        else:
            print("[  ] Search Results: No results yet")
        
        print("-" * 70)
    
    def handle_resume_input(self):
        """Handle resume input from user."""
        print("\n" + "-" * 70)
        print("RESUME INPUT")
        print("-" * 70)
        print("1. Browse and select file")
        print("2. Enter file path manually")
        print("3. Paste text directly")
        print("4. Back to main menu")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == "1":
            # File browser option
            if not TKINTER_AVAILABLE:
                print("\n[X] File browser not available. Please use option 2 to enter path manually.")
                return
            
            try:
                print("\n>>> Opening file browser...")
                # Hide the root tkinter window
                root = Tk()
                root.withdraw()
                root.attributes('-topmost', True)
                
                # Open file dialog
                file_path = filedialog.askopenfilename(
                    title="Select Resume File",
                    filetypes=[
                        ("Resume files", "*.txt *.pdf *.docx"),
                        ("Text files", "*.txt"),
                        ("PDF files", "*.pdf"),
                        ("Word documents", "*.docx"),
                        ("All files", "*.*")
                    ],
                    initialdir="."
                )
                
                # Destroy the root window
                root.destroy()
                
                if file_path:
                    print(f"Selected: {file_path}")
                    success, message = self.resume_parser.load_from_file(file_path)
                    print(f"\n{'[OK]' if success else '[X]'} {message}")
                    
                    if success:
                        preview = self.resume_parser.get_resume_preview(150)
                        print(f"\nPreview:\n{preview}")
                else:
                    print("\n[X] No file selected")
            
            except Exception as e:
                print(f"\n[X] Error opening file browser: {str(e)}")
                print("Please use option 2 to enter path manually.")
        
        elif choice == "2":
            # Manual path entry
            file_path = input("\nEnter file path: ").strip()
            if file_path:
                success, message = self.resume_parser.load_from_file(file_path)
                print(f"\n{'[OK]' if success else '[X]'} {message}")
                
                if success:
                    preview = self.resume_parser.get_resume_preview(150)
                    print(f"\nPreview:\n{preview}")
        
        elif choice == "3":
            # Paste text directly
            print("\nPaste your resume text (press Ctrl+Z then Enter on Windows, or Ctrl+D on Unix when done):")
            try:
                lines = []
                while True:
                    try:
                        line = input()
                        lines.append(line)
                    except EOFError:
                        break
                
                text = "\n".join(lines)
                success, message = self.resume_parser.load_from_text(text)
                print(f"\n{'[OK]' if success else '[X]'} {message}")
                
                if success:
                    preview = self.resume_parser.get_resume_preview(150)
                    print(f"\nPreview:\n{preview}")
            
            except KeyboardInterrupt:
                print("\n\n[X] Input cancelled")
        
        elif choice == "4":
            return
        
        else:
            print("\n[X] Invalid option")
    
    def handle_company_input(self):
        """Handle company list input."""
        print("\n" + "-" * 70)
        print("TARGET COMPANIES")
        print("-" * 70)
        print("Enter company names separated by commas")
        print("Example: Google, Microsoft, Apple, Amazon")
        
        company_string = input("\nCompanies: ").strip()
        
        if not company_string:
            print("\n[X] No companies entered")
            return
        
        companies = parse_company_list(company_string)
        
        if not companies:
            print("\n[X] No valid companies found")
            return
        
        self.companies = companies
        print(f"\n[OK] Set {len(companies)} target companies: {', '.join(companies)}")
    
    def handle_role_input(self):
        """Handle job role input."""
        print("\n" + "-" * 70)
        print("DESIRED ROLE")
        print("-" * 70)
        print("Enter the job role you're interested in")
        print("Examples: Software Engineer, Software Engineer Intern, Data Scientist")
        
        role = input("\nRole: ").strip()
        
        if not role:
            print("\n[X] No role entered")
            return
        
        self.role = role
        print(f"\n[OK] Set desired role: {role}")
    
    def handle_job_search(self):
        """Handle job search execution."""
        print("\n" + "-" * 70)
        print("JOB SEARCH")
        print("-" * 70)
        
        # Validate prerequisites
        if not self.resume_parser.is_loaded():
            print("[X] Please load a resume first (Option 1)")
            return
        
        if not self.companies:
            print("[X] Please enter target companies first (Option 2)")
            return
        
        if not self.role:
            print("[X] Please enter desired role first (Option 3)")
            return
        
        # Run search
        print(f"\n>>> Searching for '{self.role}' positions at {len(self.companies)} companies...")
        print("This may take a moment...\n")
        
        self.jobs = self.job_searcher.search_multiple_companies(
            self.companies, 
            self.role
        )
        
        if not self.jobs:
            print("[X] No jobs found. Please try different companies or role.")
            return
        
        print(f"[OK] Found {len(self.jobs)} job postings")
        
        # Compute similarity scores
        print("\n>>> Computing similarity scores...")
        
        resume_text = self.resume_parser.get_resume_text()
        self.ranked_jobs = self.similarity_calc.rank_jobs(resume_text, self.jobs)
        
        print(f"[OK] Ranked {len(self.ranked_jobs)} jobs by relevance")
        print("\n>>> Use Option 5 to view ranked results")
    
    def handle_view_results(self):
        """Handle viewing ranked results."""
        print("\n" + "-" * 70)
        print("RANKED JOB RESULTS")
        print("-" * 70)
        
        if not self.ranked_jobs:
            print("[X] No results available. Run job search first (Option 4)")
            return
        
        print(f"\nShowing top {len(self.ranked_jobs)} matches:\n")
        
        for idx, (job, score) in enumerate(self.ranked_jobs, 1):
            company = job.get("company", "Unknown")
            title = job.get("title", "Unknown Position")
            
            # Visual score indicator
            score_bar = "█" * int(score * 20)
            
            print(f"{idx:2d}. [{score:.1%}] {score_bar}")
            print(f"    {company} - {title}")
            print()
        
        print("-" * 70)
        
        # Ask if user wants details
        choice = input("\nEnter job number for details (or press Enter to return): ").strip()
        
        if choice.isdigit():
            job_idx = int(choice) - 1
            if 0 <= job_idx < len(self.ranked_jobs):
                self.display_job_details(job_idx)
            else:
                print("[X] Invalid job number")
    
    def display_job_details(self, job_idx: int):
        """Display detailed information for a specific job."""
        job, score = self.ranked_jobs[job_idx]
        
        print("\n" + "=" * 70)
        print("JOB DETAILS")
        print("=" * 70)
        print(f"Company:      {job.get('company', 'Unknown')}")
        print(f"Title:        {job.get('title', 'Unknown')}")
        print(f"Match Score:  {score:.2%}")
        print(f"URL:          {job.get('url', 'N/A')}")
        print("-" * 70)
        print("Description:")
        print(job.get('description', 'No description available'))
        print("=" * 70)
    
    def handle_export(self):
        """Handle exporting tailored resumes."""
        print("\n" + "-" * 70)
        print("EXPORT TAILORED RESUME")
        print("-" * 70)
        
        if not self.ranked_jobs:
            print("[X] No results available. Run job search first (Option 4)")
            return
        
        print("Export options:")
        print("1. Export for specific job")
        print("2. Export for top N jobs")
        print("3. Export comparison report")
        print("4. Back to main menu")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == "1":
            self.export_single_job()
        elif choice == "2":
            self.export_multiple_jobs()
        elif choice == "3":
            self.export_comparison_report()
        elif choice == "4":
            return
        else:
            print("\n[X] Invalid option")
    
    def export_single_job(self):
        """Export tailored resume for a single job."""
        print(f"\nAvailable jobs (1-{len(self.ranked_jobs)})")
        
        job_num = input("Enter job number: ").strip()
        
        if not job_num.isdigit():
            print("[X] Invalid input")
            return
        
        job_idx = int(job_num) - 1
        if job_idx < 0 or job_idx >= len(self.ranked_jobs):
            print("[X] Invalid job number")
            return
        
        job, score = self.ranked_jobs[job_idx]
        resume_text = self.resume_parser.get_resume_text()
        
        print("\n>>> Generating tailored resume...")
        content = self.exporter.generate_tailored_summary(resume_text, job)
        
        success, message = self.exporter.export_to_file(content, job)
        print(f"\n{'[OK]' if success else '[X]'} {message}")
    
    def export_multiple_jobs(self):
        """Export tailored resumes for multiple jobs."""
        print(f"\nTotal jobs available: {len(self.ranked_jobs)}")
        
        num_jobs = input("How many top jobs to export? ").strip()
        
        if not num_jobs.isdigit():
            print("[X] Invalid input")
            return
        
        n = int(num_jobs)
        if n <= 0 or n > len(self.ranked_jobs):
            print(f"[X] Please enter a number between 1 and {len(self.ranked_jobs)}")
            return
        
        # Get top N jobs
        top_jobs = [job for job, score in self.ranked_jobs[:n]]
        resume_text = self.resume_parser.get_resume_text()
        
        print(f"\n>>> Generating {n} tailored resumes...")
        success_count, total = self.exporter.export_multiple(resume_text, top_jobs)
        
        print(f"\n[OK] Successfully exported {success_count}/{total} resumes")
    
    def export_comparison_report(self):
        """Export comparison report of all jobs."""
        resume_text = self.resume_parser.get_resume_text()
        
        print("\n>>> Generating comparison report...")
        report = self.exporter.generate_comparison_report(resume_text, self.ranked_jobs)
        
        # Create a simple job dict for filename
        dummy_job = {
            "company": "All_Companies",
            "title": "Comparison_Report"
        }
        
        success, message = self.exporter.export_to_file(report, dummy_job)
        print(f"\n{'[OK]' if success else '[X]'} {message}")
    
    def clear_session(self):
        """Clear all session data."""
        print("\n" + "-" * 70)
        print("CLEAR SESSION")
        print("-" * 70)
        
        confirm = input("Are you sure you want to clear all data? (yes/no): ").strip().lower()
        
        if confirm in ['yes', 'y']:
            self.resume_parser.clear()
            self.companies = []
            self.role = ""
            self.jobs = []
            self.ranked_jobs = []
            print("\n[OK] Session cleared. Starting fresh.")
        else:
            print("\n[X] Cancelled")
    
    def run(self):
        """Main application loop."""
        self.display_banner()
        
        while True:
            try:
                self.display_menu()
                choice = input("\nSelect option (1-9): ").strip()
                
                if choice == "1":
                    self.handle_resume_input()
                elif choice == "2":
                    self.handle_company_input()
                elif choice == "3":
                    self.handle_role_input()
                elif choice == "4":
                    self.handle_job_search()
                elif choice == "5":
                    self.handle_view_results()
                elif choice == "6":
                    self.handle_export()
                elif choice == "7":
                    self.display_session_info()
                elif choice == "8":
                    self.clear_session()
                elif choice == "9":
                    print("\n" + "=" * 70)
                    print("Thank you for using Resume Auto-Fill Bot!")
                    print("=" * 70 + "\n")
                    sys.exit(0)
                else:
                    print("\n[X] Invalid option. Please select 1-9.")
            
            except KeyboardInterrupt:
                print("\n\n" + "=" * 70)
                print("Application interrupted. Goodbye!")
                print("=" * 70 + "\n")
                sys.exit(0)
            
            except Exception as e:
                print(f"\n[X] An error occurred: {str(e)}")
                print("Please try again or restart the application.\n")


def main():
    """Entry point for the application."""
    try:
        bot = ResumeAutoFillBot()
        bot.run()
    except Exception as e:
        print(f"\n[X] Fatal error: {str(e)}")
        print("Application terminated.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

