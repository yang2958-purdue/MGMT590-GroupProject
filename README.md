# 🎯 Job Search & Resume Tailoring Tool

An AI-powered application that helps you find relevant jobs and automatically tailor your resume for each position using Claude AI.

## 📋 Features

### Phase 1 (MVP) - Current Implementation
- **Resume Upload & Parsing**: Upload PDF, DOCX, or TXT resumes with automatic skill extraction
- **Job Search**: Search across multiple companies using SerpAPI (Google Jobs)
- **Smart Fit Scoring**: 
  - Fast TF-IDF cosine similarity for quick ranking
  - Optional Claude AI scoring for detailed analysis
- **AI Resume Tailoring**: Automatically customize your resume for specific jobs using Claude API
- **Multi-Step Wizard UI**: Clean, modern React interface with 6-step workflow

### Planned Features (Phase 2 & 3)
- Company career page direct scraping (Greenhouse, Lever, Workday)
- Enhanced caching layer (Redis)
- Browser automation for auto-apply (Playwright)
- Form-filling AI agent

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + Vite
- **Backend**: FastAPI (Python)
- **AI**: Claude API (Anthropic) - Sonnet 3.5
- **Job Search**: SerpAPI (Google Jobs)
- **Document Processing**: PyPDF2, python-docx
- **ML**: scikit-learn (TF-IDF scoring)

### Project Structure
```
job-search-tool/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── services/
│   │   ├── resume_parser.py    # PDF/DOCX/TXT parsing
│   │   ├── job_scraper.py      # SerpAPI integration
│   │   ├── fit_scorer.py       # TF-IDF + Claude AI scoring
│   │   └── resume_tailor.py    # Claude AI resume customization
│   └── models/
│       └── schemas.py          # Pydantic data models
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main wizard orchestrator
│   │   ├── components/         # 6 wizard step components
│   │   └── api/
│   │       └── client.js       # Axios API client
│   ├── package.json
│   └── vite.config.js
├── README.md
└── PROMPTS.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+ 
- Node.js 18+
- Claude API key ([Get one here](https://console.anthropic.com/))
- SerpAPI key ([Get one here](https://serpapi.com/)) - Optional but recommended

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   
   On Windows:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
   
   On macOS/Linux:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   # Required for resume tailoring
   ANTHROPIC_API_KEY=your_claude_api_key_here
   
   # Required for job search (highly recommended)
   SERPAPI_API_KEY=your_serpapi_key_here
   
   # Optional configuration
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

5. **Run the backend server**
   ```bash
   python main.py
   ```
   
   The API will be available at `http://localhost:8000`
   
   API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

4. **Build for production** (optional)
   ```bash
   npm run build
   npm run preview
   ```

---

## 📖 How to Use

### Step-by-Step Workflow

1. **Upload Resume** (Step 1)
   - Drag and drop your resume (PDF, DOCX, or TXT)
   - The system will automatically parse and extract skills, experience, and education

2. **Select Companies** (Step 2)
   - Add target companies manually or select from suggestions
   - You can add as many companies as you want

3. **Specify Job Titles** (Step 3)
   - Enter job titles you're interested in (e.g., "Senior Software Engineer")
   - Use specific titles for better matches

4. **Job Search** (Step 4)
   - The system automatically searches for jobs and calculates fit scores
   - This step uses TF-IDF for fast initial scoring

5. **View Ranked Results** (Step 5)
   - Browse jobs sorted by fit score (0-10)
   - See matching and missing skills for each job
   - Click any job to expand details
   - Select a job to tailor your resume

6. **Tailor Resume** (Step 6)
   - Claude AI automatically rewrites your resume for the selected job
   - Review the changes made
   - Download the tailored resume as DOCX
   - Apply to the job!

---

## 🔑 API Endpoints

### Resume Endpoints
- `POST /api/resume/upload` - Upload and parse resume
- `POST /api/resume/tailor` - Tailor resume for a job
- `GET /api/resume/download/{tailored_id}` - Download tailored resume

### Job Search Endpoints
- `POST /api/jobs/search` - Search for jobs
- `POST /api/jobs/score` - Score a single job fit
- `POST /api/jobs/score-batch` - Score multiple jobs

### Session Endpoints
- `GET /api/session` - List session items
- `GET /api/session/{item_id}` - Get specific item
- `DELETE /api/session/{item_id}` - Delete item

### Health Check
- `GET /` - Basic health check
- `GET /api/health` - Detailed health check with service status

---

## 💡 Configuration Tips

### API Keys

**Claude API (Required for resume tailoring)**
- Sign up at [console.anthropic.com](https://console.anthropic.com/)
- Cost: ~$0.01 per resume tailoring (very affordable)
- Model used: Claude 3.5 Sonnet

**SerpAPI (Recommended for job search)**
- Sign up at [serpapi.com](https://serpapi.com/)
- Free tier: 100 searches/month
- Paid: ~$50/month for 5,000 searches
- Without this key, job search will be limited

### Performance Optimization

**Fit Scoring Strategy**
- Default: Fast TF-IDF scoring for all jobs (~100ms per job)
- Optional: Claude AI scoring (slower but more accurate, ~2s per job)
- Recommendation: Use TF-IDF for initial ranking, then AI scoring for top 5-10 jobs

**Caching**
- Fit scores are cached in memory to avoid repeat API calls
- For production: Configure Redis for persistent caching

---

## 🧪 Testing

### Test Backend API
```bash
cd backend
python -m pytest  # (tests to be added)
```

### Manual Testing
1. Start both backend and frontend servers
2. Upload a sample resume
3. Search for jobs at 2-3 companies
4. Verify fit scores are calculated
5. Tailor resume for a top-ranked job
6. Download and review the tailored resume

### Check API Health
```bash
curl http://localhost:8000/api/health
```

Expected response should show service status and API key configuration.

---

## 🐛 Troubleshooting

### Common Issues

**"Failed to upload resume"**
- Check file format (must be PDF, DOCX, or TXT)
- Ensure file is not corrupted
- Check backend logs for parsing errors

**"Job search failed" or "No jobs found"**
- Verify SerpAPI key is configured correctly
- Check if you have remaining API credits
- Try broader search terms (fewer companies, generic titles)

**"Resume tailoring failed"**
- Verify Claude API key is configured
- Check you have API credits/billing enabled
- Ensure job description is not empty

**Backend won't start**
- Check Python version (3.9+ required)
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use

**Frontend won't connect to backend**
- Verify backend is running on port 8000
- Check CORS settings in backend `.env`
- Clear browser cache and reload

---

## 💰 Cost Estimation

### Per Job Application (Typical Use)
- Resume parsing: Free
- Job search (SerpAPI): ~$0.01 per search query
- TF-IDF fit scoring: Free
- Claude AI fit scoring (optional): ~$0.005 per job
- Resume tailoring (Claude): ~$0.01 per tailoring

**Total per application**: $0.01 - $0.03

### Monthly Budget (Active Job Seeker)
- 50 job searches: ~$0.50
- 50 resumes tailored: ~$0.50
- **Total**: ~$1-5/month depending on usage

This is **significantly cheaper** than premium job search services ($30-100/month).

---

## 🔐 Security Notes

- API keys are stored in `.env` file (never commit this to git!)
- Session storage is in-memory (data cleared on server restart)
- For production: Use proper authentication, HTTPS, and database storage
- Resume files are processed in memory and not permanently stored

---

## 🛣️ Roadmap

### Phase 1 ✅ (Current - MVP)
- [x] Resume parsing (PDF/DOCX/TXT)
- [x] SerpAPI job search
- [x] TF-IDF fit scoring
- [x] Claude AI resume tailoring
- [x] Multi-step React wizard UI

### Phase 2 🚧 (1-2 weeks)
- [ ] Claude AI detailed fit scoring
- [ ] Company career page scraping (Greenhouse, Lever)
- [ ] DOCX/PDF export improvements
- [ ] Redis caching layer
- [ ] User accounts and saved searches

### Phase 3 🔮 (Future)
- [ ] Browser automation (Playwright)
- [ ] Auto-apply to jobs
- [ ] Form-filling AI agent
- [ ] Application tracking dashboard
- [ ] Email notifications

---

## 🤝 Contributing

This is a class project for MGMT 590. Contributions are welcome!

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit a pull request to `main`

---

## 📝 License

This project is for educational purposes as part of MGMT 590.

---

## 👥 Team

MGMT 590 Group Project - 2026

---

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [SerpAPI Documentation](https://serpapi.com/google-jobs-api)
- [scikit-learn TF-IDF Guide](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)

---

## 🆘 Support

For questions or issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review API documentation at `http://localhost:8000/docs`
3. Check the project's Git repository issues

---

**Happy Job Hunting! 🎉**

