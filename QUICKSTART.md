# 🚀 Quick Start Guide

Get the Job Search & Resume Tailoring Tool running in 5 minutes!

## Prerequisites Check
- [ ] Python 3.9+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Claude API key ([Get one](https://console.anthropic.com/))
- [ ] SerpAPI key ([Get one](https://serpapi.com/)) - Optional but recommended

---

## ⚡ Quick Setup (Windows)

### Option 1: Using Batch Scripts (Easiest)

1. **Configure API Keys**
   
   Create `backend\.env` file:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   SERPAPI_API_KEY=your_key_here
   ```

2. **Start Backend** (First Terminal)
   ```cmd
   start-backend.bat
   ```
   Wait for "Application startup complete" message

3. **Start Frontend** (Second Terminal)
   ```cmd
   start-frontend.bat
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

---

### Option 2: Manual Setup

**Terminal 1 - Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with your API keys
python main.py
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

**Open:** `http://localhost:3000`

---

## ⚡ Quick Setup (macOS/Linux)

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file with your API keys
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Open:** `http://localhost:3000`

---

## 🧪 Quick Test

1. **Upload Resume**
   - Use any PDF/DOCX resume
   - You should see parsed skills

2. **Add Test Companies**
   - Try: "Google", "Microsoft"

3. **Add Test Job Title**
   - Try: "Software Engineer"

4. **Search Jobs**
   - Should find and rank jobs
   - ⚠️ Requires SerpAPI key

5. **Tailor Resume**
   - Select any job
   - Should generate tailored version
   - ⚠️ Requires Claude API key

---

## ❌ Troubleshooting

### Backend won't start
```powershell
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```powershell
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### "API key not configured"
- Check `.env` file exists in `backend/` directory
- Verify keys are valid (no quotes needed)
- Restart backend server after adding keys

### Jobs not found
- Verify SerpAPI key is configured
- Check your SerpAPI account has remaining credits
- Try broader search (fewer companies)

---

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [API Documentation](http://localhost:8000/docs) when backend is running
- Review the [Architecture Overview](README.md#-architecture)

---

## 💡 Pro Tips

1. **Free Tier Limits**
   - SerpAPI: 100 searches/month free
   - Claude: $5 credit for new accounts
   - Use TF-IDF scoring (free) instead of AI scoring to save costs

2. **Best Results**
   - Use a well-formatted resume
   - Be specific with job titles
   - Add 3-5 companies for optimal results

3. **Performance**
   - First search may be slow (warming up)
   - Subsequent searches are cached
   - TF-IDF scoring is instant, AI scoring takes ~2s per job

---

**Need help?** Check the [full README](README.md) or [troubleshooting guide](README.md#-troubleshooting).

