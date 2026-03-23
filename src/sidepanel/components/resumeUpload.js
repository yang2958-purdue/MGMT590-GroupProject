/**
 * Drag-and-drop resume upload component.
 * Accepts PDF and DOCX files. On drop/select, calls the resumeParser module
 * and persists the result via the storage module.
 *
 * @param {HTMLElement} container - The element to render the dropzone into.
 */
export function createResumeUpload(container) {
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
    const { setResume } = await import('../../modules/storage.js');
    const resumeData = await parseResume(file);
    await setResume(resumeData);
    showResumePreview(status, resumeData);
  } catch (err) {
    status.innerHTML = `<p style="color:var(--color-danger);">Error: ${err.message}</p>`;
  }
}

function showResumePreview(el, data) {
  el.innerHTML = `
    <div class="card">
      <p style="font-weight:600;">Parsed: ${data.fileName}</p>
      <p class="text-muted text-sm mt-8">${data.skills.length} skills detected</p>
      <div class="mt-8" style="display:flex; flex-wrap:wrap; gap:4px;">
        ${data.skills
          .map((s) => `<span class="badge badge-green">${s}</span>`)
          .join('')}
      </div>
      <p class="text-muted text-sm mt-12">Contact: ${data.contact?.name || '—'} · ${data.contact?.email || '—'} · ${data.contact?.phone || '—'}</p>
    </div>
  `;
}
