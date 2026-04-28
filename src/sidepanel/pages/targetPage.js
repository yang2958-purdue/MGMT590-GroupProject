import { createCompanyAutocomplete } from '../components/companyAutocomplete.js';
import { createTagInput } from '../components/tagInput.js';
import { createFilterControls } from '../components/filterControls.js';
import { getResume, setJobSearchState } from '../../modules/storage.js';

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
  let pollTimer = null;

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const renderState = (state) => {
    if (!state || state.status === 'idle') {
      statusEl.innerHTML = '';
      btnSearch.disabled = false;
      return;
    }

    if (state.status === 'running') {
      btnSearch.disabled = true;
      const processed = Number(state.processed || 0);
      const total = Number(state.total || 0);
      const progress = total > 0 ? `${processed}/${total}` : 'starting';
      statusEl.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><div class="spinner"></div><span class="text-muted">Searching in background... (${progress})</span></div>`;
      return;
    }

    if (state.status === 'complete') {
      btnSearch.disabled = false;
      stopPolling();
      statusEl.innerHTML = '<p class="text-muted">Search complete. Opening results...</p>';
      // Consume completion so returning to Targets does not bounce back to Results.
      void setJobSearchState({ status: 'idle' });
      window.location.hash = '#/results';
      return;
    }

    if (state.status === 'error') {
      btnSearch.disabled = false;
      stopPolling();
      statusEl.innerHTML = `<p style="color:var(--color-danger);">Error: ${state.errorMessage || 'Background search failed.'}</p>`;
    }
  };

  const pollSearchState = async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'JOB_SEARCH_STATUS' });
      if (resp?.ok) renderState(resp.state);
    } catch {
      // ignore transient background wake-up errors
    }
  };

  btnSearch.addEventListener('click', async () => {
    const companies = companyEl._getTags ? companyEl._getTags() : [];
    const titles = titleEl._getTags ? titleEl._getTags() : [];
    const filters = filterEl._getFilters ? filterEl._getFilters() : {};

    if (!companies.length && !titles.length) {
      statusEl.innerHTML = '<p style="color:var(--color-warning);">Add at least one company or job title.</p>';
      return;
    }

    btnSearch.disabled = true;
    statusEl.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><div class="spinner"></div><span class="text-muted">Starting background search...</span></div>';

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

      const resume = await getResume();
      if (!resume) {
        statusEl.innerHTML =
          '<p style="color:var(--color-warning);">Upload and parse a resume (PDF or DOCX) from the Upload tab first.</p>';
        btnSearch.disabled = false;
        return;
      }

      await setJobSearchState({
        status: 'running',
        startedAt: Date.now(),
        processed: 0,
        total: 0,
      });

      const resp = await chrome.runtime.sendMessage({ type: 'JOB_SEARCH_START', criteria });
      if (!resp?.ok) {
        throw new Error(resp?.error || 'Could not start background search.');
      }
      await pollSearchState();
      stopPolling();
      pollTimer = setInterval(() => {
        void pollSearchState();
      }, 1200);
    } catch (err) {
      statusEl.innerHTML = `<p style="color:var(--color-danger);">Error: ${err.message}</p>`;
      btnSearch.disabled = false;
    } finally {
      // keep disabled while background search is active; poll updates button state
    }
  });

  void pollSearchState();
}
