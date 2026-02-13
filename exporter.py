"""
Resume export module for generating tailored resumes.
Creates customized resume summaries based on job postings.
"""

from pathlib import Path
from typing import Dict, List
from datetime import datetime
from utils import safe_filename
from similarity import SimilarityCalculator


class ResumeExporter:
    """
    Handles exporting tailored resume content for specific job postings.
    """
    
    def __init__(self):
        self.similarity_calc = SimilarityCalculator()
    
    def generate_tailored_summary(
        self, 
        resume_text: str, 
        job: Dict[str, str]
    ) -> str:
        """
        Generate a tailored resume summary for a specific job.
        
        Args:
            resume_text: Original resume text
            job: Job dictionary with company, title, description
            
        Returns:
            Tailored summary text
        """
        company = job.get("company", "Unknown")
        title = job.get("title", "Unknown Position")
        description = job.get("description", "")
        url = job.get("url", "")
        
        # Extract overlapping keywords
        keywords = self.similarity_calc.get_top_keywords(
            resume_text, 
            description, 
            top_n=15
        )
        
        # Create summary sections
        sections = []
        
        # Header
        sections.append(f"TAILORED RESUME SUMMARY")
        sections.append(f"=" * 60)
        sections.append(f"Target Company: {company}")
        sections.append(f"Position: {title}")
        sections.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        sections.append("")
        
        # Keywords section
        if keywords:
            sections.append(f"KEY MATCHING SKILLS & KEYWORDS")
            sections.append(f"-" * 60)
            sections.append("These keywords from your resume match the job description:")
            sections.append("")
            
            # Format keywords nicely
            keyword_list = ", ".join(keywords)
            sections.append(f"  {keyword_list}")
            sections.append("")
        
        # Recommendations
        sections.append(f"RECOMMENDATIONS")
        sections.append(f"-" * 60)
        sections.append("To strengthen your application:")
        sections.append("")
        
        if keywords:
            sections.append(f"1. Emphasize these matching skills in your resume summary:")
            sections.append(f"   - {', '.join(keywords[:5])}")
            sections.append("")
        
        sections.append("2. Tailor your bullet points to highlight relevant experience")
        sections.append("   that aligns with the job description.")
        sections.append("")
        
        sections.append("3. Use action verbs and quantify achievements where possible.")
        sections.append("")
        
        sections.append("4. Mirror the language and terminology from the job posting")
        sections.append("   in your resume (where truthful and applicable).")
        sections.append("")
        
        # Original resume preview
        sections.append(f"YOUR ORIGINAL RESUME (PREVIEW)")
        sections.append(f"-" * 60)
        preview_length = 500
        resume_preview = resume_text[:preview_length]
        if len(resume_text) > preview_length:
            resume_preview += "..."
        sections.append(resume_preview)
        sections.append("")
        
        # Job description
        sections.append(f"TARGET JOB DESCRIPTION")
        sections.append(f"-" * 60)
        sections.append(description)
        sections.append("")
        
        # Footer
        if url:
            sections.append(f"Application URL: {url}")
            sections.append("")
        
        sections.append("=" * 60)
        sections.append("NOTE: This is an AI-generated summary. Review and customize")
        sections.append("before submitting. Do not add false information to your resume.")
        
        return "\n".join(sections)
    
    def export_to_file(
        self, 
        content: str, 
        job: Dict[str, str],
        output_dir: str = "."
    ) -> tuple[bool, str]:
        """
        Export tailored resume to a text file.
        
        Args:
            content: Tailored resume content
            job: Job dictionary (for filename generation)
            output_dir: Output directory path
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Create output directory if it doesn't exist
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Generate safe filename
            company = job.get("company", "company")
            title = job.get("title", "position")
            filename_base = f"{company}_{title}"
            safe_name = safe_filename(filename_base)
            
            # Add timestamp to avoid overwriting
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tailored_resume_{safe_name}_{timestamp}.txt"
            
            # Full file path
            file_path = output_path / filename
            
            # Write content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True, f"Successfully exported to: {file_path}"
            
        except PermissionError:
            return False, f"Permission denied: Cannot write to {output_dir}"
        except Exception as e:
            return False, f"Error exporting file: {str(e)}"
    
    def export_multiple(
        self, 
        resume_text: str, 
        jobs: List[Dict[str, str]],
        output_dir: str = "."
    ) -> tuple[int, int]:
        """
        Export tailored resumes for multiple jobs.
        
        Args:
            resume_text: Original resume text
            jobs: List of job dictionaries
            output_dir: Output directory path
            
        Returns:
            Tuple of (success_count, total_count)
        """
        success_count = 0
        
        for job in jobs:
            try:
                content = self.generate_tailored_summary(resume_text, job)
                success, _ = self.export_to_file(content, job, output_dir)
                
                if success:
                    success_count += 1
            except Exception as e:
                print(f"Warning: Failed to export for {job.get('company', 'unknown')}: {str(e)}")
                continue
        
        return success_count, len(jobs)
    
    def generate_comparison_report(
        self,
        resume_text: str,
        jobs_with_scores: List[tuple[Dict[str, str], float]]
    ) -> str:
        """
        Generate a comparison report of all jobs with scores.
        
        Args:
            resume_text: Original resume text
            jobs_with_scores: List of (job, score) tuples
            
        Returns:
            Comparison report text
        """
        sections = []
        
        sections.append("JOB MATCHING REPORT")
        sections.append("=" * 70)
        sections.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        sections.append(f"Total Jobs Analyzed: {len(jobs_with_scores)}")
        sections.append("")
        
        sections.append("RANKED RESULTS")
        sections.append("-" * 70)
        sections.append("")
        
        for idx, (job, score) in enumerate(jobs_with_scores, 1):
            company = job.get("company", "Unknown")
            title = job.get("title", "Unknown Position")
            url = job.get("url", "")
            
            sections.append(f"{idx}. {company} - {title}")
            sections.append(f"   Match Score: {score:.2%}")
            
            if url:
                sections.append(f"   URL: {url}")
            
            sections.append("")
        
        sections.append("=" * 70)
        sections.append("Use the 'Export' option to generate detailed summaries")
        sections.append("for specific positions.")
        
        return "\n".join(sections)


# Convenience functions
def generate_tailored_summary(
    resume_text: str, 
    job: Dict[str, str]
) -> str:
    """
    Convenience function to generate tailored summary.
    
    Args:
        resume_text: Original resume text
        job: Job dictionary
        
    Returns:
        Tailored summary text
    """
    exporter = ResumeExporter()
    return exporter.generate_tailored_summary(resume_text, job)


def export_to_file(
    content: str, 
    job: Dict[str, str],
    output_dir: str = "."
) -> tuple[bool, str]:
    """
    Convenience function to export to file.
    
    Args:
        content: Content to export
        job: Job dictionary
        output_dir: Output directory
        
    Returns:
        Tuple of (success, message)
    """
    exporter = ResumeExporter()
    return exporter.export_to_file(content, job, output_dir)

