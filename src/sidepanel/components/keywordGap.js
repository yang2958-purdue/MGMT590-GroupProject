import { getSelectedJob } from '../../modules/storage.js';

/**
 * Keyword gap analysis component.
 * Shows two columns: skills present on the resume (matched) vs
 * skills in the job description that are missing from the resume.
 *
 * @param {HTMLElement} container - The element to render the keyword gap into.
 */
export async function createKeywordGap(container) {
  const job = await getSelectedJob();

  const matched = job?.matchedKeywords || [];
  const missing = job?.missingKeywords || [];

  const topMatched = matched.slice(0, 20);
  const topMissing = missing.slice(0, 20);

  container.innerHTML = `
    <div class="card">
      <h3 class="mb-12">Keyword Gap</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <p class="text-sm" style="font-weight:600; color:var(--color-success);">Matched (${matched.length})</p>
          <div class="mt-8" style="display:flex; flex-wrap:wrap; gap:4px;">
            ${topMatched.length
              ? topMatched.map((k) => `<span class="badge badge-green">${k}</span>`).join('')
              : '<span class="text-muted text-sm">—</span>'}
          </div>
        </div>
        <div>
          <p class="text-sm" style="font-weight:600; color:var(--color-danger);">Missing (${missing.length})</p>
          <div class="mt-8" style="display:flex; flex-wrap:wrap; gap:4px;">
            ${topMissing.length
              ? topMissing.map((k) => `<span class="badge badge-red">${k}</span>`).join('')
              : '<span class="text-muted text-sm">—</span>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
