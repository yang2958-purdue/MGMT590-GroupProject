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
    </div>
  `;

  container.querySelector('#btn-replace-resume').addEventListener('click', () => {
    renderDropzone(container);
  });

  container.querySelector('#btn-remove-resume').addEventListener('click', async () => {
    await remove(KEYS.RESUME);
    renderDropzone(container);
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
    const resumeData = await parseResume(file);
    await setResume(resumeData);
    renderStoredPreview(container, resumeData);
  } catch (err) {
    status.innerHTML = `<p style="color:var(--color-danger);">Error: ${err.message}</p>`;
  }
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
