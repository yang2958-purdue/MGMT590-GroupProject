import { createResumeUpload } from '../components/resumeUpload.js';
import { getResume } from '../../modules/storage.js';

/**
 * Render the resume upload page.
 * Handles PDF/DOCX file selection, parsing, and displaying extracted data.
 * Restores previously uploaded resume from storage on re-visit.
 * @param {HTMLElement} container - The main content element to render into.
 */
export async function renderUploadPage(container) {
  container.innerHTML = `
    <h1>Upload Resume</h1>
    <p class="text-muted mt-8">Upload your resume as PDF or DOCX to get started.</p>
    <div id="upload-area" class="mt-16"></div>
    <div id="resume-preview" class="mt-16"></div>
  `;
  createResumeUpload(container.querySelector('#upload-area'));

  try {
    const stored = await getResume();
    if (stored) {
      const preview = container.querySelector('#resume-preview');
      preview.innerHTML = `
        <div class="card">
          <p style="font-weight:600;">Stored resume: ${stored.fileName}</p>
          <p class="text-muted text-sm mt-8">${stored.skills.length} skills detected</p>
          <div class="mt-8" style="display:flex; flex-wrap:wrap; gap:4px;">
            ${stored.skills
              .map((s) => `<span class="badge badge-green">${s}</span>`)
              .join('')}
          </div>
          <p class="text-muted text-sm mt-12">Contact: ${stored.contact?.name || '—'} · ${stored.contact?.email || '—'} · ${stored.contact?.phone || '—'}</p>
        </div>
      `;
    }
  } catch (_) {
    /* storage not available yet */
  }
}
