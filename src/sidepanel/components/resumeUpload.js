import { getResume, setResume, remove, KEYS } from '../../modules/storage.js';

/**
 * Drag-and-drop resume upload component.
 * If a stored resume exists, shows a preview with options to remove or replace.
 * Otherwise shows a dropzone for PDF/DOCX upload.
 *
 * @param {HTMLElement} container - The element to render the component into.
 */
export async function createResumeUpload(container) {
  const stored = await getResume();

  if (stored) {
    renderStoredPreview(container, stored);
  } else {
    renderDropzone(container);
  }
}

function renderStoredPreview(container, data) {
  const debugRows = buildResumeDebugRows(data);
  const debugTableRows = debugRows.map((row) => `
    <tr>
      <td class="debug-matrix-key">${escapeHtml(row.field)}</td>
      <td class="debug-matrix-map">${escapeHtml(row.autofillKey)}</td>
      <td class="debug-matrix-value">${escapeHtml(row.value || '—')}</td>
      <td class="debug-matrix-status">${row.value ? 'Detected' : 'Missing'}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <p style="font-weight:600;">Current resume: ${escapeHtml(data.fileName)}</p>
        <div style="display:flex; gap:8px;">
          <button id="btn-replace-resume" class="btn btn-sm" style="font-size:12px;">Upload New</button>
          <button id="btn-remove-resume" class="btn btn-sm btn-danger" style="font-size:12px;">Remove</button>
        </div>
      </div>
      <p class="text-muted text-sm mt-8">${data.skills.length} skills detected</p>
      <div class="mt-8" style="display:flex; flex-wrap:wrap; gap:4px;">
        ${data.skills
          .map((s) => `<span class="badge badge-green">${escapeHtml(s)}</span>`)
          .join('')}
      </div>
      <p class="text-muted text-sm mt-12">Contact: ${escapeHtml(data.contact?.name || '—')} · ${escapeHtml(data.contact?.email || '—')} · ${escapeHtml(data.contact?.phone || '—')}</p>

      <div class="mt-12">
        <button id="btn-toggle-debug" class="btn btn-sm" style="font-size:12px;">Show Debug Matrix</button>
      </div>

      <div id="resume-debug-matrix" class="debug-matrix mt-12" style="display:none;">
        <p class="text-sm text-muted mb-8">What the parser believes each field is:</p>
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
            ${debugTableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-replace-resume').addEventListener('click', () => {
    renderDropzone(container);
  });

  container.querySelector('#btn-remove-resume').addEventListener('click', async () => {
    await remove(KEYS.RESUME);
    renderDropzone(container);
  });

  const toggleBtn = container.querySelector('#btn-toggle-debug');
  const matrix = container.querySelector('#resume-debug-matrix');
  toggleBtn.addEventListener('click', () => {
    const isHidden = matrix.style.display === 'none';
    matrix.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? 'Hide Debug Matrix' : 'Show Debug Matrix';
  });
}

function renderDropzone(container) {
  container.innerHTML = `
    <div id="dropzone" class="card" style="
      border: 2px dashed var(--color-border);
      text-align: center;
      padding: 32px 16px;
      cursor: pointer;
      transition: border-color 0.15s;
    ">
      <p style="font-size:14px; font-weight:500;">Drop your resume here</p>
      <p class="text-muted text-sm mt-8">or click to browse (PDF, DOCX)</p>
      <input type="file" id="file-input" accept=".pdf,.docx"
             style="display:none;" />
    </div>
    <div id="upload-status" class="mt-8"></div>
  `;

  const dropzone = container.querySelector('#dropzone');
  const fileInput = container.querySelector('#file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--color-primary)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--color-border)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--color-border)';
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0], container);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0], container);
    }
  });
}

/**
 * Process an uploaded file: parse it and store the result.
 * @param {File} file
 * @param {HTMLElement} container
 */
async function handleFile(file, container) {
  const status = container.querySelector('#upload-status');
  status.innerHTML = '<div class="spinner" style="margin:0 auto;"></div>';

  try {
    const { parseResume } = await import('../../modules/resumeParser.js');
    const { parseResumeWithLLM, mergeResumeData } = await import('../../modules/llmResumeParser.js');

    const baseData = await parseResume(file);
    let resumeData = { ...baseData, parserSource: 'heuristic' };

    try {
      const llmData = await parseResumeWithLLM(baseData.rawText, baseData.fileName);
      resumeData = mergeResumeData(baseData, llmData);
    } catch (llmErr) {
      console.warn('LLM parser unavailable, using heuristic parse:', llmErr);
    }

    await setResume(resumeData);
    renderStoredPreview(container, resumeData);
  } catch (err) {
    status.innerHTML = `<p style="color:var(--color-danger);">Error: ${err.message}</p>`;
  }
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str == null ? '' : String(str);
  return el.innerHTML;
}

function buildResumeDebugRows(data) {
  const fullName = data?.contact?.name || '';
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.length > 0 ? nameParts[0] : '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const latestExp = Array.isArray(data?.experience) && data.experience.length > 0 ? data.experience[0] : {};
  const latestEdu = Array.isArray(data?.education) && data.education.length > 0 ? data.education[0] : {};
  const schoolsAttended = Array.isArray(data?.education)
    ? data.education
      .map((e) => (e?.school || '').trim())
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .join(', ')
    : '';
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
    { field: 'Schools Attended (all parsed)', autofillKey: 'education[].school', value: schoolsAttended },
    { field: 'Top Skills', autofillKey: 'skills', value: topSkills },
  ];
}
