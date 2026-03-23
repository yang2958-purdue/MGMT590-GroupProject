"""
FastAPI entry point for JobBot backend.
"""
import asyncio
import csv
import io
import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response

from core.resume_parser import parse_resume as parse_resume_core
from core import job_scorer, ats_scorer
from scrapers.bs4_scraper import Bs4Scraper
from scrapers.base_scraper import JobPosting, ScoredJobPosting

try:
    from ai.anthropic_ai import AnthropicAI
except ImportError:
    AnthropicAI = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Swap point: change import and instance to use SerpScraper
scraper = Bs4Scraper()


def _get_ai_provider():
    config = load_config()
    key = (config or {}).get("anthropic_api_key")
    if key and AnthropicAI:
        try:
            return AnthropicAI(config)
        except Exception:
            pass
    return None


ai_provider = None  # set on first use to allow config file to exist

_last_search_result: list[ScoredJobPosting] = []
_last_resume_data: dict | None = None


def get_config_path() -> str:
    return os.environ.get("JOBBOT_CONFIG_PATH", "config.json")


def load_config() -> dict:
    path = get_config_path()
    if not Path(path).exists():
        return {}
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return {}


def save_config(data: dict) -> None:
    path = get_config_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/resume/parse")
async def parse_resume_route(file: UploadFile = File(...)):
    global _last_resume_data
    if not file.filename:
        raise HTTPException(400, "Missing filename")
    content = await file.read()
    try:
        data = parse_resume_core(content, file.filename)
    except Exception as e:
        logger.warning("Resume parse error: %s", e)
        raise HTTPException(422, str(e))
    _last_resume_data = data
    return data


@app.post("/api/jobs/search")
async def search_jobs_route(body: dict):
    """
    Search for jobs and score them against the resume.

    The resume can be provided directly in the request body as `resume`
    (matching the ResumeData shape) or, if omitted, the last uploaded resume
    from /api/resume/parse is used.
    """
    titles = body.get("titles") or []
    companies = body.get("companies") or []
    location = body.get("location") or "Remote"

    resume_data = body.get("resume") or _last_resume_data
    if not resume_data or not isinstance(resume_data, dict):
        raise HTTPException(400, "Upload a resume first (parse resume) for scoring")
    raw_text = str(resume_data.get("raw_text", "") or "")

    def run_search():
        return scraper.search(titles, companies, location)

    try:
        postings: list[JobPosting] = await asyncio.to_thread(
            run_search
        )
    except Exception as e:
        logger.warning("Scraper error: %s", e)
        postings = []

    scored: list[ScoredJobPosting] = []
    for p in postings:
        fit = job_scorer.score_fit(raw_text, p.description)
        ats_val, matched, missing = ats_scorer.score_ats(raw_text, p.description)
        scored.append(
            ScoredJobPosting(
                title=p.title,
                company=p.company,
                location=p.location,
                description=p.description,
                url=p.url,
                date_posted=p.date_posted,
                fit_score=fit,
                ats_score=ats_val,
                matched_keywords=matched,
                missing_keywords=missing,
            )
        )

    scored.sort(key=lambda x: x.fit_score, reverse=True)
    _last_search_result.clear()
    _last_search_result.extend(scored)
    return [s.__dict__ if hasattr(s, "__dict__") else s for s in scored]


@app.get("/api/jobs/export-csv")
async def export_csv_route():
    rows = _last_search_result
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["title", "company", "location", "url", "fit_score", "ats_score"])
    for r in rows:
        writer.writerow([
            getattr(r, "title", r.get("title", "")),
            getattr(r, "company", r.get("company", "")),
            getattr(r, "location", r.get("location", "")),
            getattr(r, "url", r.get("url", "")),
            getattr(r, "fit_score", r.get("fit_score", "")),
            getattr(r, "ats_score", r.get("ats_score", "")),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )


@app.post("/api/resume/export-docx")
async def export_docx_route(body: dict):
    """Return DOCX file built from plain text (for tailored resume export)."""
    text = body.get("text", "")
    try:
        from docx import Document
        from docx.shared import Pt
        doc = Document()
        for line in text.splitlines():
            p = doc.add_paragraph(line)
            p.paragraph_format.space_after = Pt(6)
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.docx"},
        )
    except Exception as e:
        logger.warning("Export DOCX error: %s", e)
        raise HTTPException(500, str(e))


@app.post("/api/resume/tailor")
async def tailor_resume_route(body: dict):
    global ai_provider
    resume = body.get("resume")
    posting = body.get("posting")
    if not resume or not posting:
        raise HTTPException(400, "resume and posting required")

    if ai_provider is None:
        ai_provider = _get_ai_provider()

    from core.resume_tailor import tailor
    raw_text = resume.get("raw_text", "")
    desc = posting.get("description", "")
    ats_before, _, _ = ats_scorer.score_ats(raw_text, desc)
    result = tailor(resume, posting, ai_provider)
    tailored = result.get("tailored_text", raw_text)
    ats_after, _, _ = ats_scorer.score_ats(tailored, desc)
    return {
        "tailored_text": tailored,
        "ats_score_before": ats_before,
        "ats_score_after": ats_after,
    }


@app.get("/api/config")
def get_config_route():
    config = load_config()
    return {
        "anthropic_api_key_set": bool(config.get("anthropic_api_key")),
        "openai_api_key_set": bool(config.get("openai_api_key")),
        "serp_api_key_set": bool(config.get("serp_api_key")),
        "default_location": config.get("default_location", "Remote"),
    }


@app.post("/api/config")
async def save_config_route(body: dict):
    path = get_config_path()
    if not Path(path).exists():
        default = {
            "anthropic_api_key": "",
            "openai_api_key": "",
            "serp_api_key": "",
            "scraper": "bs4",
            "ai_provider": "anthropic",
            "default_location": "Remote",
        }
        save_config(default)
    current = load_config()
    for key in ["anthropic_api_key", "openai_api_key", "serp_api_key", "default_location"]:
        if key in body and body[key] is not None:
            current[key] = body[key]
    save_config(current)
    return {}


def main():
    parser = __import__("argparse").ArgumentParser()
    parser.add_argument("--port", type=int, default=7823)
    args = parser.parse_args()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
