import { createCompanyAutocomplete } from '../components/companyAutocomplete.js';
import { createTagInput } from '../components/tagInput.js';
import { createFilterControls } from '../components/filterControls.js';
import { scrapeJobs } from '../../modules/jobScraper.js';
import { extractSkillsLLM } from '../../modules/llmSkillExtractor.js';
import { scoreJob } from '../../modules/scorer.js';
import { getResume, setResults, setTargets } from '../../modules/storage.js';

/**
 * Render the target input page.
 * Company name autocomplete, multi-select job titles, and filter controls.
 * Search targets and results use session storage (cleared when the browser session ends).
 * @param {HTMLElement} container - The main content element to render into.
 */
export function renderTargetPage(container) {
  container.innerHTML = `
    <h1>Search Targets</h1>
    <p class="text-muted mt-8">Set your target companies, job titles, and filters.</p>
    <div id="resume-required-note" class="mt-8"></div>

    <div class="mt-16">
      <label>Companies</label>
      <div id="company-input"></div>
    </div>

    <div class="mt-16">
      <label>Job Titles</label>
      <div id="title-input"></div>
    </div>

    <div id="filter-area" class="mt-16"></div>

    <button id="btn-search" class="btn btn-primary mt-16" style="width:100%">
      Run Job Search
    </button>
    <div id="search-status" class="mt-8"></div>
  `;

  const companyEl = container.querySelector('#company-input');
  const titleEl = container.querySelector('#title-input');
  const filterEl = container.querySelector('#filter-area');
  const resumeNoteEl = container.querySelector('#resume-required-note');

  createCompanyAutocomplete(companyEl);
  createTagInput(titleEl, { storageKey: 'targetTitles', placeholder: 'e.g. Software Engineer...' });
  createFilterControls(filterEl);

  getResume().then((resume) => {
    if (!resume) {
      resumeNoteEl.innerHTML = `
        <p style="color:var(--color-warning);">
          No parsed resume found. Upload a compatible PDF or DOCX from the Upload tab before searching.
        </p>
      `;
    } else {
      resumeNoteEl.innerHTML = '';
    }
  });

  const btnSearch = container.querySelector('#btn-search');
  const statusEl = container.querySelector('#search-status');

  btnSearch.addEventListener('click', async () => {
    const companies = companyEl._getTags ? companyEl._getTags() : [];
    const titles = titleEl._getTags ? titleEl._getTags() : [];
    const filters = filterEl._getFilters ? filterEl._getFilters() : {};

    if (!companies.length && !titles.length) {
      statusEl.innerHTML = '<p style="color:var(--color-warning);">Add at least one company or job title.</p>';
      return;
    }

    btnSearch.disabled = true;
    statusEl.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><div class="spinner"></div><span class="text-muted">Searching...</span></div>';

    try {
      const criteria = {
        titles,
        companies,
        location: filters.location || '',
        salary_range_min: filters.salaryMin,
        salary_range_max: filters.salaryMax,
        experience_level: filters.experienceLevel,
        remote: filters.remote,
      };

      await setTargets({ companies, titles, filters });
      const postings = await scrapeJobs(criteria);

      const resume = await getResume();
      if (!resume) {
        statusEl.innerHTML =
          '<p style="color:var(--color-warning);">Upload and parse a resume (PDF or DOCX) from the Upload tab first.</p>';
        return;
      }

      let resumeSkills = undefined;
      let resumeExtractFailed = false;
      if (resume) {
        try {
          resumeSkills = await extractSkillsLLM(resume.rawText, 'resume');
        } catch {
          resumeExtractFailed = true;
        }
      }

      const scored = await Promise.all(
        postings.map(async (posting) => {
          if (resume) {
            const scores = await scoreJob(resume, posting, {
              resumeSkills,
              resumeExtractFailed,
            });
            return { ...posting, ...scores };
          }
          return { ...posting, fitScore: 0, atsScore: 0, matchedKeywords: [], missingKeywords: [] };
        }),
      );

      scored.sort((a, b) => b.fitScore - a.fitScore);
      await setResults(scored);

      window.location.hash = '#/results';
    } catch (err) {
      statusEl.innerHTML = `<p style="color:var(--color-danger);">Error: ${err.message}</p>`;
    } finally {
      btnSearch.disabled = false;
    }
  });
}
