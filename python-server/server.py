"""
JobBot scraper server.

A local Flask server that exposes:
- /scrape for job scraping
- /parse-resume-llm for optional ChatGPT resume parsing enhancement
"""

import json
import logging
import os
import re
from pathlib import Path

import requests
from dotenv import dotenv_values
from flask import Flask, request, jsonify
from flask_cors import CORS

import config

_server_dir = Path(__file__).resolve().parent
_project_root = _server_dir.parent


def _apply_dotenv_files(*paths: Path) -> None:
    """Merge non-empty values from multiple `.env` files (later files win on duplicate keys).

    Does not overwrite non-empty variables already present in the process environment
    (e.g. exported in the shell before startup).
    """
    merged: dict[str, str] = {}
    for p in paths:
        if not p.exists():
            continue
        for k, v in dotenv_values(p).items():
            if v is not None and str(v).strip():
                merged[k] = str(v).strip()
    for k, v in merged.items():
        if k not in os.environ or not os.environ[k].strip():
            os.environ[k] = v


_apply_dotenv_files(_project_root / ".env", _server_dir / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


def _warn_if_openai_line_empty_in_env_files() -> None:
    """If `.env` contains `OPENAI_API_KEY=` with nothing after `=`, explain why the key is missing."""
    for p in (_project_root / ".env", _server_dir / ".env"):
        if not p.exists():
            continue
        data = dotenv_values(p)
        if "OPENAI_API_KEY" not in data:
            continue
        val = data.get("OPENAI_API_KEY")
        if val is None:
            continue
        if str(val).strip():
            continue
        log.warning(
            "OPENAI_API_KEY appears in %s but has no value after '='. "
            "Add your secret on the same line (OPENAI_API_KEY=sk-...) and save the file.",
            p,
        )


if os.getenv("OPENAI_API_KEY", "").strip():
    log.info("OPENAI_API_KEY is set (ChatGPT resume parsing enabled)")
else:
    log.warning(
        "OPENAI_API_KEY is not set; set it in project `.env` or `python-server/.env`, "
        "or export it before starting the server (see README section 4.1)"
    )
    _warn_if_openai_line_empty_in_env_files()

app = Flask(__name__)
CORS(app)

# ─── Adapter loader ──────────────────────────────────────────────────────
# TODO: add per-request adapter override via request header for A/B testing

if config.ACTIVE_ADAPTER == "jobspy":
    from adapters.jobspy_adapter import JobSpyAdapter as AdapterClass
elif config.ACTIVE_ADAPTER == "beautifulsoup":
    from adapters.beautifulsoup_adapter import BeautifulSoupAdapter as AdapterClass
elif config.ACTIVE_ADAPTER == "firecrawl":
    from adapters.firecrawl_adapter import FirecrawlAdapter as AdapterClass
else:
    raise ValueError(
        f"Unknown adapter '{config.ACTIVE_ADAPTER}'. "
        f"Valid options: jobspy, beautifulsoup, firecrawl"
    )

adapter = AdapterClass()
log.info("Active scraper adapter: %s", config.ACTIVE_ADAPTER)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint used by the browser extension."""
    return jsonify({"status": "ok"})


@app.route("/scrape", methods=["POST"])
def scrape():
    """
    Scrape job postings.

    Accepts JSON body:
        {
            "titles": ["Software Engineer"],
            "companies": ["Google", "Meta"],
            "location": "Remote",
            "salary_range_min": 80000,
            "salary_range_max": 150000,
            "experience_level": "mid",
            "remote": true
        }

    Returns JSON array of JobPosting objects.
    """
    criteria = request.get_json(silent=True) or {}
    log.info("POST /scrape — criteria: %s", criteria)

    try:
        results = adapter.scrape_jobs(criteria)
        log.info("Returning %d results", len(results))
        return jsonify(results)
    except NotImplementedError as exc:
        log.warning("Adapter not implemented: %s", exc)
        return jsonify([]), 501
    except Exception as exc:
        log.exception("Scraper error: %s", exc)
        return jsonify([])


@app.route("/parse-resume-llm", methods=["POST"])
def parse_resume_llm():
    """
    Parse resume text with OpenAI chat model.

    Body:
      {
        "rawText": "<resume plain text>",
        "fileName": "resume.pdf"
      }
    """
    payload = request.get_json(silent=True) or {}
    raw_text = (payload.get("rawText") or "").strip()
    file_name = (payload.get("fileName") or "").strip()
    if not raw_text:
        return jsonify({"error": "Missing rawText"}), 400

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "OPENAI_API_KEY is not set on python server"}), 400

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    raw_text = raw_text[:24000]

    schema_instructions = {
        "fileName": file_name or "",
        "contact": {
            "name": "",
            "email": "",
            "phone": "",
        },
        "location": {
            "city": "",
            "state": "",
            "zip": "",
        },
        "skills": [""],
        "experience": [
            {
                "title": "",
                "company": "",
                "dates": "",
                "bullets": [""],
            }
        ],
        "education": [
            {
                "degree": "",
                "school": "",
                "dates": "",
            }
        ],
    }

    prompt = (
        "Extract structured resume information from the provided text. "
        "Return JSON only (no markdown, no prose), using this exact shape keys:\n"
        f"{json.dumps(schema_instructions)}\n\n"
        "Rules:\n"
        "- Name fields must preserve initials (e.g., 'Alec X. Neville').\n"
        "- Experience entries should capture both title and company where possible.\n"
        "- If unsure, use empty string.\n"
        "- Keep skills concise, deduplicated, and avoid contact/location tokens.\n"
        "- Do not invent details.\n"
    )

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=45,
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": "You are a resume parsing engine. Output valid JSON only."},
                    {"role": "user", "content": f"{prompt}\n\nResume text:\n{raw_text}"},
                ],
            },
        )
        if not response.ok:
            return jsonify({"error": f"OpenAI error ({response.status_code}): {response.text[:300]}"}), 502

        completion = response.json()
        content = (
            completion.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        parsed = _parse_json_from_llm_content(content)
        normalized = _normalize_resume_payload(parsed, file_name)
        normalized["parserSource"] = "llm"
        return jsonify(normalized)
    except Exception as exc:
        log.exception("LLM parse error: %s", exc)
        return jsonify({"error": f"LLM parse failed: {exc}"}), 500


def _parse_json_from_llm_content(content: str):
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _normalize_resume_payload(data, file_name):
    data = data or {}
    contact = data.get("contact") or {}
    location = data.get("location") or {}
    exp = data.get("experience") if isinstance(data.get("experience"), list) else []
    edu = data.get("education") if isinstance(data.get("education"), list) else []
    skills = data.get("skills") if isinstance(data.get("skills"), list) else []

    def _s(v):
        return str(v).strip() if v is not None else ""

    norm_exp = []
    for e in exp:
        if not isinstance(e, dict):
            continue
        bullets = e.get("bullets") if isinstance(e.get("bullets"), list) else []
        norm_exp.append(
            {
                "title": _s(e.get("title")),
                "company": _s(e.get("company")),
                "dates": _s(e.get("dates")),
                "bullets": [_s(b) for b in bullets if _s(b)],
            }
        )

    norm_edu = []
    for e in edu:
        if not isinstance(e, dict):
            continue
        norm_edu.append(
            {
                "degree": _s(e.get("degree")),
                "school": _s(e.get("school")),
                "dates": _s(e.get("dates")),
            }
        )

    return {
        "fileName": _s(data.get("fileName")) or _s(file_name),
        "contact": {
            "name": _s(contact.get("name")),
            "email": _s(contact.get("email")),
            "phone": _s(contact.get("phone")),
        },
        "location": {
            "city": _s(location.get("city")),
            "state": _s(location.get("state")),
            "zip": _s(location.get("zip")),
        },
        "skills": list(dict.fromkeys([_s(s) for s in skills if _s(s)])),
        "experience": norm_exp,
        "education": norm_edu,
    }


if __name__ == "__main__":
    log.info("Starting scraper server on port %d", config.PORT)
    app.run(host="127.0.0.1", port=config.PORT, debug=config.DEBUG)
