import { createResumeUpload } from '../components/resumeUpload.js';

/**
 * Render the resume upload page.
 * The resumeUpload component handles both fresh uploads and stored resume display.
 * @param {HTMLElement} container - The main content element to render into.
 */
export async function renderUploadPage(container) {
  container.innerHTML = `
    <h1>Upload Resume</h1>
    <p class="text-muted mt-8">If this is your first upload, your parsed resume is saved in local storage. If resume data already exists, you'll see "Saved resume found" and can continue or upload a new file.</p>
    <div id="upload-area" class="mt-16"></div>
  `;

  await createResumeUpload(container.querySelector('#upload-area'));
}
