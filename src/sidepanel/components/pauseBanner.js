/**
 * Autofill pause banner component.
 * Displayed when the autofill engine encounters an unknown field
 * or account-creation form. Prompts the user to complete the step
 * manually, then click "Resume" to continue autofilling.
 *
 * @param {HTMLElement} container - The element to render the banner into.
 * @param {Object} options
 * @param {string} options.message - The reason for pausing.
 * @param {Function} options.onResume - Callback when user clicks Resume.
 */
export function createPauseBanner(container, { message = '', onResume = () => {} } = {}) {
  container.innerHTML = `
    <div class="card" style="border-color:var(--color-warning); background:rgba(245,158,11,0.08);">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">&#9888;</span>
        <div style="flex:1;">
          <p style="font-weight:600; font-size:13px;">Autofill Paused</p>
          <p class="text-muted text-sm">${message || 'Complete this step manually, then resume.'}</p>
        </div>
        <button id="btn-resume-autofill" class="btn">Resume</button>
      </div>
    </div>
  `;

  container.querySelector('#btn-resume-autofill').addEventListener('click', onResume);
}
