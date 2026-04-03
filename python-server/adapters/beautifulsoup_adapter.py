"""
BeautifulSoup scraper adapter (mock implementation).

Returns realistic mock job postings that incorporate the query's titles
and companies so the JS scoring pipeline can be tested against real-looking data.
"""

# TODO: Replace mock data with real BeautifulSoup scraping logic.
# When implementing for real:
# 1. Build search URLs from criteria (e.g. Indeed, Greenhouse, Lever).
# 2. GET each URL with requests + realistic User-Agent.
# 3. Parse with BeautifulSoup, extract job cards.
# 4. Follow links for full descriptions.
# 5. time.sleep(1.5) between requests.
# 6. Catch HTTP/parsing errors, log warning, continue.
# 7. Return deduplicated list of JobPosting dicts.

import datetime
from .base_adapter import BaseAdapter

MOCK_DESCRIPTIONS = [
    (
        "We are looking for a talented {title} to join our engineering team at {company}. "
        "You will work on building scalable distributed systems using Python, Go, and AWS. "
        "Requirements: 3+ years experience with microservices architecture, REST APIs, "
        "Docker, Kubernetes, CI/CD pipelines. Experience with PostgreSQL, Redis, and "
        "message queues (Kafka/RabbitMQ) is a plus. Strong communication skills required. "
        "BS in Computer Science or equivalent."
    ),
    (
        "{company} is hiring a {title} to drive product development. "
        "You'll collaborate with cross-functional teams to ship features in React, TypeScript, "
        "and Node.js. We need someone comfortable with agile methodologies, Git workflows, "
        "and test-driven development. Familiarity with GraphQL, MongoDB, and cloud platforms "
        "(GCP or Azure) preferred. 2-5 years of professional software development experience."
    ),
    (
        "Join {company} as a {title}! This role focuses on data engineering and analytics. "
        "Key skills: SQL, Python, Apache Spark, ETL pipelines, data warehousing. "
        "Experience with Snowflake, dbt, Airflow, and Tableau highly valued. "
        "You'll design data models, optimize query performance, and build dashboards "
        "for stakeholders. Strong problem-solving and attention to detail essential."
    ),
    (
        "{company} seeks an experienced {title} for our machine learning team. "
        "Responsibilities include training and deploying ML models, building feature "
        "pipelines, and conducting A/B experiments. Required: Python, TensorFlow or "
        "PyTorch, scikit-learn, pandas, NumPy. Experience with NLP, computer vision, "
        "or recommendation systems is a bonus. MS/PhD in a quantitative field preferred."
    ),
    (
        "We're expanding our team at {company} and need a {title} with strong "
        "full-stack skills. Tech stack: Java/Spring Boot backend, React frontend, "
        "PostgreSQL database, deployed on AWS with Terraform. You should be comfortable "
        "with system design, code reviews, mentoring junior developers, and on-call "
        "rotations. 5+ years experience required. Excellent benefits and equity."
    ),
]

LOCATIONS = [
    "San Francisco, CA",
    "New York, NY",
    "Seattle, WA",
    "Austin, TX",
    "Remote",
]

SALARIES = [
    "$90,000 - $120,000",
    "$110,000 - $150,000",
    "$130,000 - $175,000",
    "$100,000 - $140,000",
    "$120,000 - $160,000",
]


class BeautifulSoupAdapter(BaseAdapter):
    """Mock BeautifulSoup scraper that returns realistic fake postings."""

    def scrape_jobs(self, criteria: dict) -> list[dict]:
        """
        Return mock job postings incorporating the query titles and companies.

        Args:
            criteria: Search criteria dict (see BaseAdapter.scrape_jobs).

        Returns:
            List of 5 mock JobPosting dicts.
        """
        titles = criteria.get("titles", ["Software Engineer"])
        companies = criteria.get("companies", ["Acme Corp"])
        location = criteria.get("location", "")

        results = []
        today = datetime.date.today()

        for i, desc_template in enumerate(MOCK_DESCRIPTIONS):
            title = titles[i % len(titles)]
            company = companies[i % len(companies)]
            loc = location if location else LOCATIONS[i % len(LOCATIONS)]

            results.append({
                "title": title,
                "company": company,
                "location": loc,
                "description": desc_template.format(title=title, company=company),
                "url": f"https://example.com/jobs/{company.lower().replace(' ', '-')}/{i + 1}",
                "date_posted": str(today - datetime.timedelta(days=i)),
                "salary": SALARIES[i % len(SALARIES)],
            })

        return results
