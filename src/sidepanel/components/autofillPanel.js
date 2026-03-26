/**
 * Autofill control panel component.
 *
 * Displays the current autofill status and provides Pause/Resume/Skip controls.
 * State is read from chrome.storage.local (autofillState) and updated via
 * chrome.runtime.onMessage from the content script.
 *
 * @param {HTMLElement} container - The element to render the panel into.
 * @param {Object} callbacks
 * @param {function} callbacks.onPause
 * @param {function} callbacks.onResume
 * @param {function} callbacks.onSkip
 */
export function createAutofillPanel(container, { onPause, onResume, onSkip } = {}) {
  container.innerHTML = `
    <div class="card" id="af-panel">
      <div id="af-status" style="margin-bottom:12px;">
        <span class="badge badge-amber" id="af-status-badge">Initializing...</span>
      </div>
      <div id="af-progress" style="margin-bottom:12px;">
        <div style="background:var(--color-border); border-radius:4px; height:6px; overflow:hidden;">
          <div id="af-progress-bar" style="width:0%; height:100%; background:var(--color-primary); transition:width 0.3s;"></div>
        </div>
        <p class="text-muted text-sm mt-8" id="af-progress-text">—</p>
      </div>
      <div id="af-field-label" class="text-sm" style="margin-bottom:12px; min-height:20px;"></div>
      <div style="display:flex; gap:8px;">
        <button id="af-btn-pause" class="btn" style="flex:1;">Pause</button>
        <button id="af-btn-resume" class="btn btn-primary" style="flex:1; display:none;">Resume</button>
        <button id="af-btn-skip" class="btn" style="display:none;">Skip Field</button>
      </div>
      <div id="af-complete" style="display:none; margin-top:12px;">
        <div class="card" style="border-color:var(--color-success); background:rgba(34,197,94,0.08); text-align:center; padding:16px;">
          <p style="font-weight:600;">Page complete</p>
          <p class="text-muted text-sm mt-8">Click Next on the application page when ready.</p>
        </div>
      </div>
    </div>
  `;

  const btnPause = container.querySelector('#af-btn-pause');
  const btnResume = container.querySelector('#af-btn-resume');
  const btnSkip = container.querySelector('#af-btn-skip');

  btnPause.addEventListener('click', () => onPause?.());
  btnResume.addEventListener('click', () => onResume?.());
  btnSkip.addEventListener('click', () => onSkip?.());
}

/**
 * Update the autofill panel UI to reflect the current state.
 *
 * @param {HTMLElement} container - The panel container.
 * @param {Object} state
 * @param {"scanning"|"filling"|"paused"|"complete"|"error"} state.status
 * @param {number} [state.filledCount]
 * @param {number} [state.totalFields]
 * @param {string} [state.fieldLabel]
 * @param {string} [state.reason]
 * @param {string} [state.errorMessage]
 */
export function updateAutofillPanel(container, state) {
  const badge = container.querySelector('#af-status-badge');
  const progressBar = container.querySelector('#af-progress-bar');
  const progressText = container.querySelector('#af-progress-text');
  const fieldLabel = container.querySelector('#af-field-label');
  const btnPause = container.querySelector('#af-btn-pause');
  const btnResume = container.querySelector('#af-btn-resume');
  const btnSkip = container.querySelector('#af-btn-skip');
  const completeEl = container.querySelector('#af-complete');

  if (!badge) return;

  const { status, filledCount = 0, totalFields = 0 } = state;
  const pct = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${filledCount} of ${totalFields} fields`;

  btnPause.style.display = 'none';
  btnResume.style.display = 'none';
  btnSkip.style.display = 'none';
  completeEl.style.display = 'none';

  switch (status) {
    case 'scanning':
      badge.className = 'badge badge-amber';
      badge.textContent = 'Scanning page...';
      fieldLabel.textContent = '';
      break;

    case 'filling':
      badge.className = 'badge badge-amber';
      badge.textContent = `Filling fields (${filledCount} of ${totalFields})...`;
      fieldLabel.textContent = state.fieldLabel ? `Current: ${state.fieldLabel}` : '';
      btnPause.style.display = 'block';
      break;

    case 'paused':
      badge.className = 'badge badge-red';
      badge.textContent = 'Paused';
      fieldLabel.textContent = state.reason || 'Complete this field manually, then resume.';
      btnResume.style.display = 'block';
      btnSkip.style.display = 'block';
      break;

    case 'complete':
      badge.className = 'badge badge-green';
      badge.textContent = 'Complete';
      fieldLabel.textContent = '';
      progressBar.style.width = '100%';
      progressText.textContent = `${filledCount} of ${totalFields} fields filled`;
      completeEl.style.display = 'block';
      break;

    case 'error':
      badge.className = 'badge badge-red';
      badge.textContent = 'Error';
      fieldLabel.textContent = state.errorMessage || 'An error occurred.';
      break;

    default:
      break;
  }
}
