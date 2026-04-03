import { getSelectedJob } from '../../modules/storage.js';

/**
 * Job posting detail panel component.
 * Displays the full posting text with matched keywords highlighted.
 * Shows fit score and ATS score.
 *
 * @param {HTMLElement} container - The element to render the detail panel into.
 */
export async function createDetailPanel(container) {
  const job = await getSelectedJob();

  if (!job) {
    container.innerHTML = '<div class="card"><p class="text-muted">Select a job from the results to see details.</p></div>';
    return;
  }

  let desc = job.description || '';
  if (job.matchedKeywords && job.matchedKeywords.length) {
    for (const kw of job.matchedKeywords.slice(0, 30)) {
      const re = new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      desc = desc.replace(re, '<mark style="background:rgba(34,197,94,0.25); padding:0 2px; border-radius:2px;">$1</mark>');
    }
  }

  container.innerHTML = `
    <div class="card">
      <h2>${job.title}</h2>
      <p class="text-muted">${job.company} · ${job.location}</p>
      <div style="display:flex; gap:12px; margin-top:12px;">
        <div>
          <span class="text-sm text-muted">Fit Score</span>
          <div style="font-size:20px; font-weight:700; color:var(--color-primary);">${job.fitScore?.toFixed(1) ?? '—'}</div>
        </div>
        <div>
          <span class="text-sm text-muted">ATS Score</span>
          <div style="font-size:20px; font-weight:700; color:var(--color-info);">${Math.round(job.atsScore ?? 0)}%</div>
        </div>
      </div>
      ${job.salary ? `<p class="mt-8 text-sm">Salary: ${job.salary}</p>` : ''}
      ${job.url ? `<a href="${job.url}" target="_blank" class="text-sm" style="color:var(--color-primary); display:inline-block; margin-top:8px;">Open posting ↗</a>` : ''}
    </div>
    <div class="card mt-12">
      <h3 class="mb-8">Job Description</h3>
      <div style="font-size:13px; line-height:1.7; white-space:pre-wrap;">${desc}</div>
    </div>
  `;
}
