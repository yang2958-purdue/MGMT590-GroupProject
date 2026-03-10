"""
FastAPI main application - Job Search & Resume Tailoring Tool
"""
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
from typing import Dict
import uuid

from models import (
    ResumeUploadResponse,
    JobSearchRequest,
    JobSearchResponse,
    JobListing,
    FitScoreRequest,
    FitScoreResponse,
    TailorResumeRequest,
    TailorResumeResponse,
    ErrorResponse
)
from services import resume_parser, job_scraper, fit_scorer, resume_tailor

# Initialize FastAPI app
app = FastAPI(
    title="Job Search & Resume Tailoring API",
    description="AI-powered job search and resume customization tool",
    version="1.0.0"
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (use Redis in production)
session_storage: Dict[str, Dict] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Job Search & Resume Tailoring API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    anthropic_configured = bool(os.getenv("ANTHROPIC_API_KEY"))
    serpapi_configured = bool(os.getenv("SERPAPI_API_KEY"))
    
    return {
        "status": "healthy",
        "services": {
            "resume_parser": "available",
            "job_scraper": "available" if serpapi_configured else "limited (no API key)",
            "fit_scorer": "available",
            "resume_tailor": "available" if anthropic_configured else "unavailable (no API key)"
        },
        "configuration": {
            "anthropic_api": anthropic_configured,
            "serpapi": serpapi_configured
        }
    }


@app.post("/api/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload and parse a resume
    Accepts: PDF, DOCX, TXT
    """
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = '.' + file.filename.split('.')[-1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse resume
        parsed_data = resume_parser.parse_file(content, file.filename)
        
        # Store in session
        resume_id = parsed_data["resume_id"]
        session_storage[resume_id] = {
            "type": "resume",
            "data": parsed_data,
            "uploaded_at": datetime.now().isoformat()
        }
        
        return ResumeUploadResponse(**parsed_data)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")


@app.post("/api/jobs/search", response_model=JobSearchResponse)
async def search_jobs(request: JobSearchRequest):
    """
    Search for jobs matching criteria
    Uses SerpAPI (Google Jobs) or fallback methods
    """
    try:
        # Perform search
        jobs = job_scraper.search_jobs(
            companies=request.companies,
            job_titles=request.job_titles,
            location=request.location,
            max_results=request.max_results
        )
        
        # Convert to JobListing models
        job_listings = [JobListing(**job) for job in jobs]
        
        # Store jobs in session for later reference
        for job_listing in job_listings:
            session_storage[job_listing.job_id] = {
                "type": "job",
                "data": job_listing.dict(),
                "searched_at": datetime.now().isoformat()
            }
        
        return JobSearchResponse(
            jobs=job_listings,
            total_found=len(job_listings),
            search_timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")


@app.post("/api/jobs/score", response_model=FitScoreResponse)
async def score_job_fit(request: FitScoreRequest):
    """
    Score how well a resume fits a job description
    Can use fast TF-IDF or slower Claude AI scoring
    """
    try:
        # Score the fit
        result = fit_scorer.score_fit(
            resume_text=request.resume_text,
            job_description=request.job_description,
            use_ai=request.use_ai
        )
        
        # Add job_id to result
        result["job_id"] = request.job_id
        
        return FitScoreResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.post("/api/jobs/score-batch")
async def score_multiple_jobs(resume_id: str, job_ids: list[str], use_ai: bool = False):
    """
    Score multiple jobs at once (batch endpoint)
    Useful for ranking all search results
    """
    try:
        # Get resume from session
        if resume_id not in session_storage:
            raise HTTPException(status_code=404, detail="Resume not found in session")
        
        resume_data = session_storage[resume_id]["data"]
        resume_text = resume_data["raw_text"]
        
        # Score each job
        results = []
        for job_id in job_ids:
            if job_id not in session_storage:
                continue
            
            job_data = session_storage[job_id]["data"]
            job_description = job_data["description"]
            
            score_result = fit_scorer.score_fit(
                resume_text=resume_text,
                job_description=job_description,
                use_ai=use_ai
            )
            
            results.append({
                "job_id": job_id,
                **score_result
            })
        
        # Sort by score (descending)
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return {"scores": results, "total_scored": len(results)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch scoring failed: {str(e)}")


@app.post("/api/resume/tailor", response_model=TailorResumeResponse)
async def tailor_resume(request: TailorResumeRequest):
    """
    Tailor a resume for a specific job
    Uses Claude AI to rewrite and optimize content
    """
    try:
        result = resume_tailor.tailor_resume(
            resume_text=request.resume_text,
            job_description=request.job_description,
            output_format=request.output_format
        )
        
        # Store tailored resume in session
        tailored_id = result["tailored_resume_id"]
        session_storage[tailored_id] = {
            "type": "tailored_resume",
            "data": result,
            "created_at": datetime.now().isoformat(),
            "original_resume_id": request.resume_id,
            "target_job_id": request.job_id
        }
        
        return TailorResumeResponse(**result)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume tailoring failed: {str(e)}")


@app.get("/api/resume/download/{tailored_id}")
async def download_tailored_resume(tailored_id: str):
    """
    Download a tailored resume
    Returns the file as a download
    """
    try:
        # Get file path
        filepath = resume_tailor.get_tailored_resume(tailored_id)
        
        # Determine media type
        if filepath.endswith('.docx'):
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filepath.endswith('.pdf'):
            media_type = "application/pdf"
        else:
            media_type = "text/plain"
        
        return FileResponse(
            filepath,
            media_type=media_type,
            filename=os.path.basename(filepath)
        )
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tailored resume not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@app.get("/api/session/{item_id}")
async def get_session_item(item_id: str):
    """
    Get an item from session storage
    Useful for retrieving previously uploaded resumes or searched jobs
    """
    if item_id not in session_storage:
        raise HTTPException(status_code=404, detail="Item not found in session")
    
    return session_storage[item_id]


@app.delete("/api/session/{item_id}")
async def delete_session_item(item_id: str):
    """Delete an item from session storage"""
    if item_id in session_storage:
        del session_storage[item_id]
        return {"status": "deleted", "item_id": item_id}
    
    raise HTTPException(status_code=404, detail="Item not found")


@app.get("/api/session")
async def list_session_items():
    """List all items in current session"""
    items = []
    for item_id, item_data in session_storage.items():
        items.append({
            "id": item_id,
            "type": item_data["type"],
            "timestamp": item_data.get("uploaded_at") or item_data.get("searched_at") or item_data.get("created_at")
        })
    
    return {"items": items, "total": len(items)}


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug
    )

