import { getResults, setSelectedJob } from '../../modules/storage.js';

/**
 * Sortable job results table component.
 * Columns: Company, Title, Fit Score (0-10), ATS Score (0-100).
 * Sortable ascending/descending by clicking column headers.
 * Clicking a row navigates to the detail page.
 *
 * @param {HTMLElement} container - The element to render the table into.
 */
export async function createJobTable(container) {
  const results = await getResults();

  if (!results || !results.length) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:32px;">
        <p class="text-muted">No results yet. Run a search first.</p>
      </div>
    `;
    return;
  }

  let sortKey = 'fitScore';
  let sortAsc = false;

  function scoreBadge(value, max) {
    const pct = value / max;
    const cls = pct >= 0.7 ? 'badge-green' : pct >= 0.4 ? 'badge-amber' : 'badge-red';
    return `<span class="badge ${cls}">${max === 10 ? value.toFixed(1) : Math.round(value)}${max === 100 ? '%' : ''}</span>`;
  }

  function render() {
    const sorted = [...results].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (typeof va === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(vb) : String(vb).localeCompare(va);
    });

    const arrow = (key) => (sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '');

    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border); text-align:left;">
            <th style="padding:8px; cursor:pointer;" data-sort="company">Company${arrow('company')}</th>
            <th style="padding:8px; cursor:pointer;" data-sort="title">Title${arrow('title')}</th>
            <th style="padding:8px; cursor:pointer; width:55px;" data-sort="fitScore">Fit${arrow('fitScore')}</th>
            <th style="padding:8px; cursor:pointer; width:55px;" data-sort="atsScore">ATS${arrow('atsScore')}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map(
              (job, i) => `
            <tr data-idx="${i}" style="border-bottom:1px solid var(--color-border); cursor:pointer; transition:background 0.1s;"
                onmouseover="this.style.background='var(--color-surface-hover)'"
                onmouseout="this.style.background='transparent'">
              <td style="padding:8px;">${job.company}</td>
              <td style="padding:8px;">${job.title}</td>
              <td style="padding:8px;">${scoreBadge(job.fitScore, 10)}</td>
              <td style="padding:8px;">${scoreBadge(job.atsScore, 100)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = key;
          sortAsc = false;
        }
        render();
      });
    });

    container.querySelectorAll('tr[data-idx]').forEach((tr) => {
      tr.addEventListener('click', async () => {
        const idx = Number(tr.dataset.idx);
        await setSelectedJob(sorted[idx]);
        window.location.hash = '#/detail';
      });
    });
  }

  render();
}
