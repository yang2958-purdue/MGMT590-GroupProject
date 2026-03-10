"""
Example test script demonstrating programmatic usage of the Resume Auto-Fill Bot.
This shows how to use the modules without the CLI interface.
"""

from resume_parser import ResumeParser
from job_search import JobSearcher
from similarity import SimilarityCalculator
from exporter import ResumeExporter
from utils import parse_company_list


def main():
    """
    Example of using the bot programmatically.
    """
    print("=" * 70)
    print("Resume Auto-Fill Bot - Programmatic Example")
    print("=" * 70)
    
    # 1. Load Resume
    print("\n1. Loading resume...")
    parser = ResumeParser()
    success, message = parser.load_from_file("sample_resume.txt")
    
    if not success:
        print(f"Error: {message}")
        return
    
    print(f"✓ {message}")
    print(f"Resume length: {parser.get_word_count()} words")
    
    # 2. Set up job search parameters
    print("\n2. Setting up job search...")
    companies = parse_company_list("Google, Microsoft, Amazon, Apple, Stripe")
    role = "Software Engineer Intern"
    print(f"✓ Companies: {', '.join(companies)}")
    print(f"✓ Role: {role}")
    
    # 3. Search for jobs
    print("\n3. Searching for jobs...")
    searcher = JobSearcher()
    jobs = searcher.search_multiple_companies(companies, role)
    print(f"✓ Found {len(jobs)} job postings")
    
    # 4. Compute similarity scores
    print("\n4. Computing similarity scores...")
    calc = SimilarityCalculator()
    resume_text = parser.get_resume_text()
    ranked_jobs = calc.rank_jobs(resume_text, jobs)
    print(f"✓ Ranked {len(ranked_jobs)} jobs")
    
    # 5. Display top 5 matches
    print("\n5. Top 5 Matches:")
    print("-" * 70)
    for idx, (job, score) in enumerate(ranked_jobs[:5], 1):
        print(f"{idx}. [{score:.1%}] {job['company']} - {job['title']}")
    
    # 6. Export tailored resume for top match
    if ranked_jobs:
        print("\n6. Exporting tailored resume for top match...")
        exporter = ResumeExporter()
        top_job, top_score = ranked_jobs[0]
        
        # Generate summary
        summary = exporter.generate_tailored_summary(resume_text, top_job)
        
        # Export to file
        success, message = exporter.export_to_file(summary, top_job)
        if success:
            print(f"✓ {message}")
        else:
            print(f"✗ {message}")
    
    # 7. Display keyword analysis for top match
    if ranked_jobs:
        print("\n7. Keyword Analysis for Top Match:")
        print("-" * 70)
        top_job, _ = ranked_jobs[0]
        keywords = calc.get_top_keywords(
            resume_text, 
            top_job['description'], 
            top_n=10
        )
        print(f"Overlapping keywords: {', '.join(keywords)}")
    
    print("\n" + "=" * 70)
    print("Example completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()

