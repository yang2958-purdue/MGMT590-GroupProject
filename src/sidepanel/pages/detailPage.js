import { createDetailPanel } from '../components/detailPanel.js';
import { createKeywordGap } from '../components/keywordGap.js';
import { getSelectedJob } from '../../modules/storage.js';

/**
 * Render the job detail page.
 * Shows the full posting, fit/ATS scores, keyword gap analysis,
 * and opens the listing URL in a new tab (autofill runs from the Autofill page).
 * @param {HTMLElement} container - The main content element to render into.
 */
export async function renderDetailPage(container) {
  container.innerHTML = `
    <h1>Job Detail</h1>
    <div id="detail-content" class="mt-16"></div>
    <div id="keyword-gap" class="mt-16"></div>
    <button id="btn-open-posting" class="btn btn-primary mt-16" style="width:100%;">
      Open job posting
    </button>
    <p class="text-muted text-sm mt-8">
      After you reach the real application site (e.g. Workday), use <strong>Autofill</strong> in the nav to fill the active tab.
    </p>
    <button id="btn-back-results" class="btn mt-16" style="width:100%;">
      &larr; Back to Results
    </button>
  `;

  await createDetailPanel(container.querySelector('#detail-content'));
  await createKeywordGap(container.querySelector('#keyword-gap'));

  container.querySelector('#btn-back-results').addEventListener('click', () => {
    window.location.hash = '#/results';
  });

  const btnOpen = container.querySelector('#btn-open-posting');
  btnOpen.addEventListener('click', async () => {
    const job = await getSelectedJob();
    if (!job || !job.url) {
      btnOpen.textContent = 'No URL available';
      btnOpen.disabled = true;
      return;
    }
    await chrome.tabs.create({ url: job.url, active: true });
  });
}
