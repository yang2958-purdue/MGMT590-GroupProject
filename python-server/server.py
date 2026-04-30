"""
JobBot scraper server.

A local Flask server that exposes:
- /scrape for job scraping
- /parse-resume-llm for optional ChatGPT resume parsing enhancement
- /extract-skills for LLM-based skill phrase extraction (ATS scoring / tailoring)
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
from prompts.skills_extraction import (
    SKILLS_JSON_SYSTEM,
    SKILLS_JSON_USER_JOB,
    SKILLS_JSON_USER_RESUME,
)

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


def _openai_api_key_from_request() -> str:
    """Prefer per-request key from the extension; fall back to server environment."""
    header_key = (request.headers.get("X-OpenAI-API-Key") or "").strip()
    if header_key:
        return header_key
    return os.getenv("OPENAI_API_KEY", "").strip()


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
CORS(app, allow_headers=["Content-Type", "X-OpenAI-API-Key"])

KNOWN_UNIVERSITIES = [
    "Purdue University",
    "Massachusetts Institute of Technology",
    "Stanford University",
    "Harvard University",
    "University of California",
    "University of Michigan",
    "University of Texas",
    "Texas A&M University",
    "Carnegie Mellon University",
    "Georgia Institute of Technology",
    "University of Illinois",
    "Cornell University",
    "Columbia University",
    "Princeton University",
    "Yale University",
    "University of Washington",
    "University of Wisconsin",
    "University of Florida",
    "New York University",
    "University of Southern California",
]

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
    return jsonify(
        {
            "status": "ok",
            "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        }
    )


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
    Parse resume using OpenAI model.

    Body:
      {
        "rawText": "<resume plain text>",
        "fileName": "resume.pdf",
        "fileData": "<base64 PDF bytes, optional>",
        "fileMimeType": "application/pdf"
      }
    """
    payload = request.get_json(silent=True) or {}
    raw_text = (payload.get("rawText") or "").strip()
    file_name = (payload.get("fileName") or "").strip()
    file_data = (payload.get("fileData") or "").strip()
    file_mime_type = (payload.get("fileMimeType") or "").strip().lower()
    has_pdf_payload = bool(file_data and file_mime_type == "application/pdf")

    if not raw_text and not has_pdf_payload:
        return jsonify({"error": "Missing rawText or PDF fileData"}), 400

    api_key = _openai_api_key_from_request()
    if not api_key:
        return jsonify(
            {
                "error": "OPENAI_API_KEY is not set. Add it in the extension (Settings → API keys) "
                "or in project `.env` / `python-server/.env` for the server."
            }
        ), 400

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    raw_text = raw_text[:24000]
    if len(file_data) > 12_000_000:
        return jsonify({"error": "fileData payload is too large"}), 400

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
                "location": "",
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

    school_candidates = _extract_school_candidates(raw_text if raw_text else "")

    prompt = (
        "Extract structured resume information from the provided resume document. "
        "Return JSON only (no markdown, no prose), using this exact shape keys:\n"
        f"{json.dumps(schema_instructions)}\n\n"
        "Rules:\n"
        "- Primary source is the attached resume file when provided (PDF). Use the full document content.\n"
        "- Use the provided raw text only as fallback/context if needed.\n"
        "- Name fields must preserve initials (e.g., 'Alec X. Neville').\n"
        "- Extract location (city, state, ZIP) from the contact/header block, address lines, or lines labeled Address, Location, Mailing address, or similar. If the resume shows a US address, use a 2-letter state abbreviation when clearly implied (e.g. IL for Illinois). If city and state appear in a pipe-separated line (e.g. \"Name | City, ST | email\"), capture them.\n"
        "- If no ZIP code is found in the contact/header block, infer a representative ZIP code based on the city and state from that contact section only. Do not use locations from experience or education sections.\n"
        "- Experience entries should capture both title and company where possible.\n"
        "- For each experience entry, set `location` to the job site or employment location stated for that role (city/state, Remote, etc.). Do not copy the candidate's contact/mailing address into `location` unless the resume clearly uses it as the job location.\n"
        "- For education.school, scan the ENTIRE resume text (not just the Education header).\n"
        "- Prefer institution names that clearly look like universities/colleges/institutes/schools.\n"
        "- Campus handling: if a school appears without a campus qualifier, assume main campus (e.g., 'Purdue University' -> 'Purdue University - Main Campus').\n"
        "- If the resume explicitly states a campus, preserve it exactly (e.g., 'Purdue University - Fort Wayne').\n"
        "- Do not use field of study as school (e.g., 'Robotics and Automation' is not a school).\n"
        f"- Candidate school strings found in text (use when present): {json.dumps(school_candidates)}\n"
        f"- Known university dictionary for fuzzy matching (use if present in resume): {json.dumps(KNOWN_UNIVERSITIES)}\n"
        "- If unsure, use empty string.\n"
        "- Keep skills concise, deduplicated, and avoid contact/location tokens.\n"
        "- Populate skills with technologies, tools, frameworks, and languages mentioned in work experience bullets, project descriptions, and the rest of the resume — not only from a dedicated Skills section.\n"
        "- Do not invent details.\n"
    )

    try:
        response = _call_openai_resume_parser(
            api_key=api_key,
            model=model,
            prompt=prompt,
            raw_text=raw_text,
            file_name=file_name or "resume.pdf",
            file_data=file_data,
            file_mime_type=file_mime_type,
        )
        if not response.ok:
            return jsonify({"error": f"OpenAI error ({response.status_code}): {response.text[:300]}"}), 502

        completion = response.json()
        content = _extract_llm_text(completion)
        parsed = _parse_json_from_llm_content(content)
        normalized = _normalize_resume_payload(parsed, file_name)
        normalized["parserSource"] = "llm"
        return jsonify(normalized)
    except Exception as exc:
        log.exception("LLM parse error: %s", exc)
        return jsonify({"error": f"LLM parse failed: {exc}"}), 500


def _call_openai_resume_parser(
    api_key: str,
    model: str,
    prompt: str,
    raw_text: str,
    file_name: str,
    file_data: str,
    file_mime_type: str,
):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    has_pdf_payload = bool(file_data and file_mime_type == "application/pdf")

    # Use Responses API for file-aware parsing when a PDF is available.
    if has_pdf_payload:
        user_content = [
            {"type": "input_text", "text": prompt},
        ]
        if raw_text:
            user_content.append(
                {
                    "type": "input_text",
                    "text": f"Fallback extracted text (use only if needed):\n{raw_text}",
                }
            )
        user_content.append(
            {
                "type": "input_file",
                "filename": file_name or "resume.pdf",
                "file_data": f"data:{file_mime_type};base64,{file_data}",
            }
        )
        return requests.post(
            "https://api.openai.com/v1/responses",
            headers=headers,
            timeout=60,
            json={
                "model": model,
                "temperature": 0,
                "input": [
                    {
                        "role": "system",
                        "content": [{"type": "input_text", "text": "You are a resume parsing engine. Output valid JSON only."}],
                    },
                    {"role": "user", "content": user_content},
                ],
            },
        )

    # Fallback for text-only inputs.
    return requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
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


def _extract_llm_text(payload: dict) -> str:
    # Chat Completions shape.
    chat_text = (
        (payload.get("choices", [{}])[0].get("message", {}) or {}).get("content", "")
        if isinstance(payload, dict)
        else ""
    )
    if isinstance(chat_text, str) and chat_text.strip():
        return chat_text

    # Responses API convenience field.
    output_text = payload.get("output_text", "") if isinstance(payload, dict) else ""
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    # Responses API nested output blocks.
    if isinstance(payload, dict):
        outputs = payload.get("output") or []
        if isinstance(outputs, list):
            for out in outputs:
                content = out.get("content") if isinstance(out, dict) else None
                if not isinstance(content, list):
                    continue
                for block in content:
                    txt = block.get("text") if isinstance(block, dict) else ""
                    if isinstance(txt, str) and txt.strip():
                        return txt
    return ""


@app.route("/extract-skills", methods=["POST"])
def extract_skills():
    """
    Extract skill phrases from resume or job text via OpenAI.

    Body:
      { "text": "<plain text>", "kind": "resume" | "job" }
    """
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    kind = (payload.get("kind") or "").strip().lower()
    if not text:
        return jsonify({"error": "Missing text"}), 400
    if kind not in ("resume", "job"):
        return jsonify({"error": 'kind must be "resume" or "job"'}), 400

    api_key = _openai_api_key_from_request()
    if not api_key:
        return jsonify(
            {
                "error": "OPENAI_API_KEY is not set. Add it in the extension (Settings → API keys) "
                "or in project `.env` / `python-server/.env` for the server."
            }
        ), 400

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    text = text[:24000]

    user_prefix = SKILLS_JSON_USER_RESUME if kind == "resume" else SKILLS_JSON_USER_JOB
    user_content = f"{user_prefix}{text}"

    log.info("POST /extract-skills — kind=%s, len=%d", kind, len(text))

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
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": SKILLS_JSON_SYSTEM},
                    {"role": "user", "content": user_content},
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
        skills = _normalize_skills_payload(parsed)
        return jsonify({"skills": skills})
    except Exception as exc:
        log.exception("extract-skills error: %s", exc)
        return jsonify({"error": f"extract-skills failed: {exc}"}), 500


def _normalize_skills_payload(parsed) -> list[str]:
    if not isinstance(parsed, dict):
        return []
    raw = parsed.get("skills")
    if not isinstance(raw, list):
        return []
    out = []
    seen = set()
    for item in raw:
        if item is None:
            continue
        s = str(item).strip()
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= 80:
            break
    return out


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
                "location": _s(e.get("location")),
                "bullets": [_s(b) for b in bullets if _s(b)],
            }
        )

    norm_edu = []
    for e in edu:
        if not isinstance(e, dict):
            continue
        school = _s(e.get("school"))
        if school:
            school = _pick_best_school_name(school)
        norm_edu.append(
            {
                "degree": _s(e.get("degree")),
                "school": school,
                "dates": _s(e.get("dates")),
            }
        )

    norm_edu = _collapse_minor_only_education_entries(norm_edu)

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


def _collapse_minor_only_education_entries(entries: list[dict]) -> list[dict]:
    out: list[dict] = []

    def _is_minor_only(degree: str) -> bool:
        d = (degree or "").strip().lower()
        if not d:
            return False
        has_minor = bool(re.search(r"\bminor\b", d))
        has_primary = bool(
            re.search(r"\b(bachelor|master|ph\.?d|doctor|associate|mba|b\.?s|b\.?a|m\.?s|m\.?a)\b", d)
        )
        return has_minor and not has_primary

    for e in entries:
        degree = str(e.get("degree") or "").strip()
        school = str(e.get("school") or "").strip()
        dates = str(e.get("dates") or "").strip()

        if not _is_minor_only(degree):
            out.append({"degree": degree, "school": school, "dates": dates})
            continue

        target = next(
            (
                x
                for x in out
                if str(x.get("school") or "").strip().lower() == school.lower()
                and not _is_minor_only(str(x.get("degree") or "").strip())
            ),
            None,
        )
        if target:
            minor_text = re.sub(r"^\s*minor\s*(in)?\s*", "", degree, flags=re.I).strip()
            addition = f"Minor: {minor_text}" if minor_text else degree
            if addition.lower() not in str(target.get("degree") or "").lower():
                target["degree"] = (
                    f"{target['degree']}; {addition}" if str(target.get("degree") or "").strip() else addition
                )
            if not str(target.get("dates") or "").strip() and dates:
                target["dates"] = dates
        # otherwise drop minor-only row so it does not become a separate education block

    return out


def _normalize_school_text(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (text or "").lower())).strip()


def _extract_school_candidates(raw_text: str):
    lines = [ln.strip() for ln in (raw_text or "").splitlines() if ln.strip()]
    candidates = []
    school_kw = re.compile(
        r"\b(university|college|institute|school|polytechnic|academy|conservatory)\b",
        re.I,
    )

    for line in lines:
        if len(line) > 120:
            continue
        if school_kw.search(line):
            line_no_dates = re.sub(
                r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}.*$",
                "",
                line,
                flags=re.I,
            ).strip(" ,|-")
            if line_no_dates:
                candidates.append(line_no_dates)

    # Add known university matches found anywhere in text.
    raw_norm = _normalize_school_text(raw_text)
    for uni in KNOWN_UNIVERSITIES:
        if _normalize_school_text(uni) in raw_norm:
            candidates.append(uni)

    # Deduplicate while preserving order.
    out = []
    seen = set()
    for c in candidates:
        key = _normalize_school_text(c)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out[:20]


def _pick_best_school_name(school_text: str) -> str:
    school = (school_text or "").strip()
    if not school:
        return ""
    norm = _normalize_school_text(school)
    has_explicit_campus = bool(
        re.search(r"\b(campus|fort wayne|northwest|global|online|satellite|regional|west lafayette)\b", school, re.I)
    )
    for uni in KNOWN_UNIVERSITIES:
        uni_norm = _normalize_school_text(uni)
        if uni_norm in norm or norm in uni_norm:
            if has_explicit_campus:
                return school
            # Default to main campus when the university is named but campus is unspecified.
            return f"{uni} - Main Campus"
    return school


if __name__ == "__main__":
    log.info("Starting scraper server on port %d", config.PORT)
    app.run(host="127.0.0.1", port=config.PORT, debug=config.DEBUG)
