import { getResume } from '../../modules/storage.js';

/**
 * Dedicated debug page for inspecting parsed resume values and autofill keys.
 * @param {HTMLElement} container
 */
export async function renderDebugPage(container) {
  container.innerHTML = `
    <h1>Debug</h1>
    <p class="text-muted mt-8">Inspect what the parser extracted and which autofill keys map to each value.</p>
    <div id="debug-content" class="mt-16"></div>
  `;

  const host = container.querySelector('#debug-content');
  const resume = await getResume();
  if (!resume) {
    host.innerHTML = `
      <div class="card">
        <p>No parsed resume data found.</p>
        <p class="text-muted text-sm mt-8">Upload a resume on the Upload tab first, then return here.</p>
      </div>
    `;
    return;
  }

  const rows = buildResumeDebugRows(resume);
  const experienceRows = buildExperienceRows(resume);
  const tableRows = rows.map((row) => `
    <tr>
      <td class="debug-matrix-key">${escapeHtml(row.field)}</td>
      <td class="debug-matrix-map">${escapeHtml(row.autofillKey)}</td>
      <td class="debug-matrix-value">${escapeHtml(row.value || '—')}</td>
      <td class="debug-matrix-status">${row.value ? 'Detected' : 'Missing'}</td>
    </tr>
  `).join('');

  host.innerHTML = `
    <div class="card">
      <h3>Parsed Resume Matrix</h3>
      <p class="text-muted text-sm mt-8">Source file: ${escapeHtml(resume.fileName || 'Unknown')}</p>

      <div class="debug-matrix mt-12">
        <table class="debug-matrix-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Autofill Key</th>
              <th>Parsed Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card mt-16">
      <h3>Parsed Work Experience</h3>
      <p class="text-muted text-sm mt-8">All jobs parsed from resume, in detected order.</p>

      <div class="debug-matrix mt-12">
        <table class="debug-matrix-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Company</th>
              <th>Dates</th>
              <th>Bullets</th>
            </tr>
          </thead>
          <tbody>
            ${experienceRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildResumeDebugRows(data) {
  const fullName = data?.contact?.name || '';
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.length > 0 ? nameParts[0] : '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const latestExp = Array.isArray(data?.experience) && data.experience.length > 0 ? data.experience[0] : {};
  const latestEdu = Array.isArray(data?.education) && data.education.length > 0 ? data.education[0] : {};
  const topSkills = Array.isArray(data?.skills) ? data.skills.slice(0, 8).join(', ') : '';

  return [
    { field: 'Parser Source', autofillKey: 'parserSource', value: data?.parserSource || 'heuristic' },
    { field: 'Full Name', autofillKey: 'name', value: fullName },
    { field: 'First Name (derived)', autofillKey: 'firstName', value: firstName },
    { field: 'Middle Name (derived)', autofillKey: 'middleName', value: middleName },
    { field: 'Last Name (derived)', autofillKey: 'lastName', value: lastName },
    { field: 'Email', autofillKey: 'email', value: data?.contact?.email || '' },
    { field: 'Phone', autofillKey: 'phone', value: data?.contact?.phone || '' },
    { field: 'City (parsed)', autofillKey: 'commonAnswers.city', value: data?.location?.city || '' },
    { field: 'State (parsed)', autofillKey: 'commonAnswers.state', value: data?.location?.state || '' },
    { field: 'ZIP (parsed)', autofillKey: 'commonAnswers.zip', value: data?.location?.zip || '' },
    { field: 'Latest Job Title', autofillKey: 'workExperience[0].title', value: latestExp?.title || '' },
    { field: 'Latest Company', autofillKey: 'workExperience[0].company', value: latestExp?.company || '' },
    { field: 'Latest Degree', autofillKey: 'education[0].degree', value: latestEdu?.degree || '' },
    { field: 'Latest School', autofillKey: 'education[0].school', value: latestEdu?.school || '' },
    { field: 'Top Skills', autofillKey: 'skills', value: topSkills },
  ];
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str == null ? '' : String(str);
  return el.innerHTML;
}

function buildExperienceRows(data) {
  const experience = Array.isArray(data?.experience) ? data.experience : [];
  if (experience.length === 0) {
    return `
      <tr>
        <td colspan="5" class="text-muted">No experience entries were parsed.</td>
      </tr>
    `;
  }

  return experience
    .map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(entry?.title || '—')}</td>
        <td>${escapeHtml(entry?.company || '—')}</td>
        <td>${escapeHtml(entry?.dates || '—')}</td>
        <td>${Array.isArray(entry?.bullets) ? entry.bullets.length : 0}</td>
      </tr>
    `)
    .join('');
}
