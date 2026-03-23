"""Base scraper protocol and job posting dataclasses."""

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class JobPosting:
    title: str
    company: str
    location: str
    description: str
    url: str
    date_posted: str = ""


@dataclass
class ScoredJobPosting(JobPosting):
    fit_score: float = 0.0
    ats_score: float = 0.0
    matched_keywords: list = field(default_factory=list)
    missing_keywords: list = field(default_factory=list)


class BaseScraper(Protocol):
    def search(
        self,
        titles: list[str],
        companies: list[str],
        location: str,
    ) -> list[JobPosting]: ...
