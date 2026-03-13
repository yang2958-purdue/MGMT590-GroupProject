# Resume Compatibility Analyzer - Architecture

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────────┐  │
│  │ Resume   │  Jobs    │ Analysis │  Optimize│  Autofill    │  │
│  │  Input   │ Listings │ Results  │          │   (NEW!)     │  │
│  └──────────┴──────────┴──────────┴──────────┴───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌───────────────┬─────────────┬──────────────┬──────────────┐  │
│  │   Resume      │    Job      │ Compatibility│  Autofill   │  │
│  │  Ingestion    │   Fetch     │   Service    │  Service    │  │
│  │   Service     │  Service    │              │   (NEW!)    │  │
│  └───────────────┴─────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                               │
│  ┌──────────────┬─────────────────────────────────────────────┐ │
│  │   Models     │         Scoring Engines                     │ │
│  │  - Resume    │  - Keyword Matcher                          │ │
│  │  - Job       │  - Semantic Matcher                         │ │
│  │  - Analysis  │  - ATS Rules                                │ │
│  │  - Optimize  │  - Scoring Engine                           │ │
│  └──────────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                            │
│  ┌─────────┬─────────┬─────────┬────────────────────────────┐  │
│  │ Parsers │   OCR   │   APIs  │  Browser Automation (NEW!) │  │
│  │  - PDF  │ - Local │ - Jobs  │  - Playwright Client       │  │
│  │  - DOCX │ - API   │ - Agent │  - Field Mapping           │  │
│  │  - Text │         │         │  - Site Adapters           │  │
│  │  - Image│         │         │    • Generic               │  │
│  │         │         │         │    • Workday               │  │
│  │         │         │         │    • Greenhouse            │  │
│  └─────────┴─────────┴─────────┴────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Resume Processing Flow

```
User Upload/Paste
    ↓
File Type Detection
    ↓
Parser Selection (PDF/DOCX/TXT/Image)
    ↓
Text Extraction (+ OCR if needed)
    ↓
Text Cleaning & Normalization
    ↓
Section Detection
    ↓
Skill Extraction
    ↓
Experience/Education Parsing
    ↓
Resume Model Created
    ↓
Stored in Memory + Display in GUI
```

### 2. Compatibility Analysis Flow

```
Resume Model + Job Listing
    ↓
Parallel Scoring:
├─→ Keyword Matcher (30%)
├─→ Skill Matcher (25%)
├─→ Semantic Matcher (20%)
├─→ Experience Matcher (15%)
└─→ Education Matcher (10%)
    ↓
Weighted Score Calculation
    ↓
ATS Rules Evaluation
    ↓
Recommendation Generation
    ↓
AnalysisResult Model
    ↓
Display in GUI
```

### 3. Browser Autofill Flow *(NEW)*

```
Resume Model + Application URL
    ↓
Launch Playwright Browser
    ↓
Navigate to URL
    ↓
Detect Platform Type
├─→ Workday? → Load Workday Adapter
├─→ Greenhouse? → Load Greenhouse Adapter
└─→ Generic → Load Generic Adapter
    ↓
Adapter Pre-Fill Setup
    ↓
Scan Page for Form Elements
    ↓
Extract Element Attributes
    ↓
Field Detection & Mapping
├─→ Match by ID
├─→ Match by name
├─→ Match by placeholder
├─→ Match by aria-label
└─→ Calculate confidence
    ↓
Extract Values from Resume Model
    ↓
Fill Each Mapped Field
    ↓
Adapter Post-Fill Actions
    ↓
Take Screenshot
    ↓
Pause for Human Review
    ↓
Return AutofillResult
    ↓
Display Results in GUI
```

---

## 📁 Directory Structure

```
MGMT590-GroupProject/
├── app/
│   ├── application/
│   │   ├── controllers/          (Reserved for future)
│   │   └── services/
│   │       ├── resume_ingestion_service.py
│   │       ├── job_fetch_service.py
│   │       ├── compatibility_service.py
│   │       ├── ats_service.py
│   │       ├── optimization_service.py
│   │       └── form_autofill_service.py      ← NEW
│   │
│   ├── domain/
│   │   ├── models/
│   │   │   ├── resume.py
│   │   │   ├── job_listing.py
│   │   │   ├── analysis_result.py
│   │   │   └── optimization_result.py
│   │   ├── scoring/
│   │   │   ├── keyword_matcher.py
│   │   │   ├── semantic_matcher.py
│   │   │   ├── ats_rules.py
│   │   │   └── scoring_engine.py
│   │   └── utils/
│   │       ├── text_cleaning.py
│   │       ├── section_parser.py
│   │       └── skill_extractor.py
│   │
│   ├── infrastructure/
│   │   ├── parsers/
│   │   │   ├── pdf_parser.py
│   │   │   ├── docx_parser.py
│   │   │   ├── text_parser.py
│   │   │   └── image_parser.py
│   │   ├── ocr/
│   │   │   ├── local_ocr_client.py
│   │   │   └── api_ocr_client.py
│   │   ├── api/
│   │   │   ├── jobs_api_client.py
│   │   │   ├── agent_api_client.py
│   │   │   └── schemas.py
│   │   └── browser/                          ← NEW
│   │       ├── playwright_client.py          ← NEW
│   │       ├── field_mapping_service.py      ← NEW
│   │       └── site_profiles/                ← NEW
│   │           ├── base_adapter.py           ← NEW
│   │           ├── generic_adapter.py        ← NEW
│   │           ├── workday_adapter.py        ← NEW
│   │           └── greenhouse_adapter.py     ← NEW
│   │
│   ├── gui/
│   │   ├── main_window.py
│   │   ├── resume_panel.py
│   │   ├── jobs_panel.py
│   │   ├── analysis_panel.py
│   │   ├── optimization_panel.py
│   │   ├── autofill_panel.py                 ← NEW
│   │   └── widgets/
│   │       ├── score_card.py
│   │       ├── keyword_table.py
│   │       └── loading_overlay.py
│   │
│   ├── config/
│   │   ├── settings.py
│   │   └── endpoints.py
│   │
│   └── tests/
│       ├── test_parsers.py
│       ├── test_scoring.py
│       └── test_ats_rules.py
│
├── main.py
├── requirements.txt
├── .env.example
├── .gitignore
│
├── Sample Data/
│   ├── sample_resume.txt
│   ├── sample_resume_detailed.txt
│   ├── sample_resume_data_scientist.txt
│   ├── sample_resume_business_analyst.txt     ← NEW
│   ├── sample_resume_project_manager.txt      ← NEW
│   └── sample_resume_consultant.txt           ← NEW
│
└── Documentation/
    ├── README.md
    ├── QUICKSTART.md
    ├── TEST_INSTRUCTIONS.md
    ├── PROJECT_SUMMARY.md
    ├── FEATURE_COMPLETE.md
    ├── BROWSER_AUTOFILL.md                    ← NEW
    ├── AUTOFILL_UPDATE_SUMMARY.md             ← NEW
    ├── DARK_THEME_UPDATES.md
    └── BUSINESS_ROLES_UPDATE.md
```

---

## 🔌 Component Interactions

### Resume Loading → All Features

```
ResumePanel.resume_loaded (signal)
    ↓
    ├─→ AnalysisPanel.set_resume()
    ├─→ OptimizationPanel.set_resume()
    └─→ AutofillPanel.set_resume()          ← NEW
```

### Job Selection → Analysis & Optimization

```
JobsPanel.job_selected (signal)
    ↓
    ├─→ AnalysisPanel.set_job()
    └─→ OptimizationPanel.set_job()
```

### Browser Autofill Architecture

```
AutofillPanel (GUI)
    ↓
FormAutofillService
    ↓
    ├─→ PlaywrightClient (browser control)
    ├─→ FieldMappingService (field detection)
    └─→ SiteAdapter (platform-specific)
        ├─→ GenericAdapter
        ├─→ WorkdayAdapter
        └─→ GreenhouseAdapter
```

---

## 🎯 Design Patterns Used

### 1. Adapter Pattern
**Site-specific adapters** for different ATS platforms:
```python
class BaseSiteAdapter(ABC):
    @abstractmethod
    def detect() -> bool
    
    @abstractmethod
    def get_custom_selectors() -> Dict
```

### 2. Service Layer Pattern
**Services orchestrate business logic**:
```python
ResumeIngestionService
JobFetchService
CompatibilityService
OptimizationService
FormAutofillService  ← NEW
```

### 3. Worker Thread Pattern
**Non-blocking GUI operations**:
```python
class AutofillWorker(QThread):
    finished = Signal(object)
    error = Signal(str)
```

### 4. Context Manager Pattern
**Resource cleanup**:
```python
with PlaywrightClient() as browser:
    browser.navigate(url)
    browser.fill_fields(...)
# Automatic cleanup
```

### 5. Strategy Pattern
**Multiple detection strategies** for field mapping:
```python
strategies = [
    match_by_id,
    match_by_name,
    match_by_placeholder,
    match_by_aria_label
]
```

---

## 🔒 Security & Privacy

### Data Handling
- ✅ All processing local (no cloud uploads)
- ✅ Resume data never transmitted
- ✅ Browser automation local
- ✅ No telemetry or tracking
- ✅ Screenshots optional

### User Control
- ✅ Feature toggles (enable/disable autofill)
- ✅ Manual submission required
- ✅ Review mode standard
- ✅ Visible browser default
- ✅ Clear logging

---

## 📈 Scalability & Extensibility

### Easy to Extend

**Add New Platform**:
1. Create adapter class inheriting from `BaseSiteAdapter`
2. Implement `detect()` and `get_custom_selectors()`
3. Register in factory (automatic detection)

**Add New Field Type**:
1. Add pattern to `FIELD_PATTERNS` dict
2. Add extractor to `get_resume_value()`
3. Automatic detection and filling

**Add New Parser**:
1. Create parser class (e.g., `RTFParser`)
2. Add to ingestion service
3. Update allowed extensions

---

## 🎓 Technology Choices & Rationale

### Why PySide6?
- Professional desktop GUI
- Cross-platform (macOS, Windows, Linux)
- Native performance
- Qt is industry standard
- Free license (LGPL)

### Why Playwright?
- Modern browser automation
- Better than Selenium for web apps
- Auto-waits for elements
- Multiple browser support
- Active development

### Why scikit-learn?
- Production-ready ML library
- TF-IDF for semantic analysis
- No heavy dependencies
- Well-documented

### Why Layered Architecture?
- Separation of concerns
- Easy testing
- Maintainable code
- Clear responsibilities
- Extensible design

---

## 🧪 Testing Strategy

### Unit Tests
- ✅ Parser tests (text extraction)
- ✅ Scoring tests (keyword matching)
- ✅ ATS rules tests (evaluation logic)

### Integration Tests
- Manual GUI testing
- End-to-end workflow verification
- Sample data validation

### Future: Autofill Tests
```python
# pytest-playwright integration
def test_generic_form_autofill(page):
    page.goto("https://test-form.com")
    result = autofill_service.fill(resume, page)
    assert result.fields_filled > 5
```

---

## 📊 Performance Characteristics

### Typical Operation Times

| Operation | Time | Notes |
|-----------|------|-------|
| Parse TXT | < 1s | Instant |
| Parse PDF | 1-3s | Depends on size |
| Parse Image (OCR) | 2-5s | Tesseract processing |
| Compatibility Analysis | 2-4s | ML calculations |
| Resume Optimization | 1-3s | Local mode |
| Browser Autofill | 5-15s | Including form detection |

### Resource Usage
- **Memory**: ~100-200 MB (GUI + Python)
- **Disk**: 600 KB application code
- **CPU**: Low (except during ML calculations)
- **Browser**: +150 MB when autofill active

---

## 🔮 Future Architecture Considerations

### Potential Enhancements

1. **Database Layer**
   - SQLite for application history
   - Track filled applications
   - Analytics on success rates

2. **API Backend**
   - Convert services to REST API
   - Support web frontend
   - Multi-user support

3. **LLM Integration**
   - AI-powered cover letter generation
   - Custom question answering
   - Interview preparation

4. **Batch Processing**
   - Queue system for multiple applications
   - Parallel browser instances
   - Rate limiting

---

## 🎯 Key Architectural Decisions

### Decision 1: Desktop vs Web
**Chosen**: Desktop
**Rationale**: Privacy, offline capability, no server costs

### Decision 2: Local vs Cloud Processing
**Chosen**: Local with optional cloud
**Rationale**: Privacy, speed, cost, user control

### Decision 3: Selector-Based vs Coordinate-Based
**Chosen**: Selector-based
**Rationale**: More reliable, maintainable, works across resolutions

### Decision 4: Manual vs Auto-Submit
**Chosen**: Manual submission required
**Rationale**: Safety, legal, user control, error prevention

### Decision 5: Platform Adapters vs Generic Only
**Chosen**: Adapter pattern with platform support
**Rationale**: Better success rates, extensible, maintainable

---

**Architecture designed for: Maintainability, Extensibility, Production Use** 🏗️
