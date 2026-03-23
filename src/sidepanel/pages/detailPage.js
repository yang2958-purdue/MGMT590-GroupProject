import { createDetailPanel } from '../components/detailPanel.js';
import { createKeywordGap } from '../components/keywordGap.js';

/**
 * Render the job detail page.
 * Shows the full posting, fit/ATS scores, and keyword gap analysis.
 * @param {HTMLElement} container - The main content element to render into.
 */
export async function renderDetailPage(container) {
  container.innerHTML = `
    <h1>Job Detail</h1>
    <div id="detail-content" class="mt-16"></div>
    <div id="keyword-gap" class="mt-16"></div>
    <button id="btn-back-results" class="btn mt-16" style="width:100%;">
      ← Back to Results
    </button>
  `;

  await createDetailPanel(container.querySelector('#detail-content'));
  await createKeywordGap(container.querySelector('#keyword-gap'));

  container.querySelector('#btn-back-results').addEventListener('click', () => {
    window.location.hash = '#/results';
  });
}
