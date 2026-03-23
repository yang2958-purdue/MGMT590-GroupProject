import { createJobTable } from '../components/jobTable.js';

/**
 * Render the ranked results page.
 * Displays a sortable table of scored job postings.
 * Clicking a row navigates to the detail page.
 * @param {HTMLElement} container - The main content element to render into.
 */
export async function renderResultsPage(container) {
  container.innerHTML = `
    <h1>Results</h1>
    <p class="text-muted mt-8">Job postings ranked by fit and ATS score.</p>
    <div id="results-table" class="mt-16"></div>
  `;

  try {
    await createJobTable(container.querySelector('#results-table'));
  } catch (e) {
    container.querySelector('#results-table').innerHTML = `<p style="color:var(--color-danger);">Error loading results: ${e.message}</p>`;
  }
}
