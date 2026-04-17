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
      <div id="af-skipped-required" style="display:none; margin-top:12px;">
        <div class="card" style="border-color:var(--color-warning); background:rgba(251,191,36,0.08); padding:12px;">
          <p style="font-weight:600; color:var(--color-warning); margin-bottom:8px;">⚠️ Missing profile data</p>
          <p class="text-muted text-sm mb-8">Some required fields were skipped. Add this info in Settings → Profile:</p>
          <ul id="af-skipped-list" class="text-sm" style="margin:0; padding-left:20px;"></ul>
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
 * @param {Array<{label: string, fieldType: string, suggestedDataKey?: string}>} [state.skippedRequired]
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
  const skippedRequiredEl = container.querySelector('#af-skipped-required');
  const skippedListEl = container.querySelector('#af-skipped-list');

  if (!badge) return;

  const { status, filledCount = 0, totalFields = 0 } = state;
  const pct = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${filledCount} of ${totalFields} fields`;

  btnPause.style.display = 'none';
  btnResume.style.display = 'none';
  btnSkip.style.display = 'none';
  completeEl.style.display = 'none';
  
  // Show skipped required fields warning (if any)
  if (state.skippedRequired && state.skippedRequired.length > 0) {
    skippedRequiredEl.style.display = 'block';
    skippedListEl.innerHTML = state.skippedRequired
      .map((field) => {
        const hint = getProfileHint(field.suggestedDataKey);
        return `<li style="margin-bottom:4px;"><strong>${escapeHtml(field.label)}</strong>${hint ? ` — ${hint}` : ''}</li>`;
      })
      .join('');
  } else {
    skippedRequiredEl.style.display = 'none';
  }

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

/**
 * Get a user-friendly hint for what profile field to fill based on the data key.
 * @param {string | undefined} dataKey
 * @returns {string}
 */
function getProfileHint(dataKey) {
  if (!dataKey) return 'check Settings → Profile';
  
  const hints = {
    // Location/Contact (Settings → Profile → Mailing/location)
    'commonAnswers.address': 'add Street Address in Settings → Profile',
    'commonAnswers.city': 'add City in Settings → Profile',
    'commonAnswers.state': 'add State in Settings → Profile',
    'commonAnswers.zip': 'add ZIP code in Settings → Profile',
    'commonAnswers.country': 'add Country in Settings → Profile',
    
    // Work Authorization (Settings → Profile → Application answers)
    'commonAnswers.workAuthorization': 'add "Authorized to work" in Settings → Profile',
    'commonAnswers.sponsorship': 'add "Requires sponsorship" in Settings → Profile',
    'commonAnswers.citizenship': 'add Citizenship in Settings → Profile',
    'commonAnswers.relocation': 'add Relocation preference in Settings → Profile',
    'commonAnswers.salary': 'add Desired Salary in Settings → Profile',
    'commonAnswers.sensitiveOptional': 'add EEO/Veteran answer in Settings → Profile',
    
    // Contact & Documents (Settings → Profile → Contact & documents)
    'linkedin': 'add LinkedIn URL in Settings → Profile',
    'coverLetter': 'add Cover Letter in Settings → Profile',
    
    // Resume Corrections (Settings → Profile → Resume corrections)
    'firstName': 'add First Name in Settings → Resume Corrections',
    'lastName': 'add Last Name in Settings → Resume Corrections',
    'middleName': 'add Middle Name in Settings → Resume Corrections',
    'name': 'add Full Name in Settings → Resume Corrections',
    'email': 'add Email in Settings → Resume Corrections',
    'phone': 'add Phone in Settings → Resume Corrections',
    
    // Work Experience (Settings → Resume Corrections → Most recent role)
    'workExperience[0].title': 'add Job Title in Settings → Resume Corrections',
    'workExperience[0].company': 'add Company in Settings → Resume Corrections',
    'workExperience[0].dates': 'add Work Dates in Settings → Resume Corrections',
    'workExperience[0].startDate': 'add Work Start Date in Settings → Resume Corrections',
    'workExperience[0].endDate': 'add Work End Date in Settings → Resume Corrections',
    'workExperience[0].location': 'add Work Location in Settings → Resume Corrections',
    'workExperience[0].description': 'add Role Description in Settings → Resume Corrections',
    
    // Education (Settings → Resume Corrections → Education)
    'education[0].school': 'add School in Settings → Resume Corrections',
    'education[0].degree': 'add Degree in Settings → Resume Corrections',
    'education[0].dates': 'add Education Dates in Settings → Resume Corrections',
    
    // Skills
    'skills': 'add Skills in Settings → Resume Corrections',
  };
  
  // Check for exact match first
  if (hints[dataKey]) return hints[dataKey];
  
  // Check for pattern matches (e.g., workExperience[1], workExperience[2], etc.)
  if (dataKey.startsWith('workExperience[')) {
    if (dataKey.includes('.title')) return 'add Job Title in Settings → Resume Corrections';
    if (dataKey.includes('.company')) return 'add Company in Settings → Resume Corrections';
    if (dataKey.includes('.dates') || dataKey.includes('Date')) return 'add Work Dates in Settings → Resume Corrections';
    if (dataKey.includes('.location')) return 'add Work Location in Settings → Resume Corrections';
    if (dataKey.includes('.description')) return 'add Role Description in Settings → Resume Corrections';
    return 'add Work Experience in Settings → Resume Corrections';
  }
  
  if (dataKey.startsWith('education[')) {
    if (dataKey.includes('.school')) return 'add School in Settings → Resume Corrections';
    if (dataKey.includes('.degree')) return 'add Degree in Settings → Resume Corrections';
    if (dataKey.includes('.dates')) return 'add Education Dates in Settings → Resume Corrections';
    return 'add Education in Settings → Resume Corrections';
  }
  
  // Custom answers (from custom Q&A section)
  if (dataKey.startsWith('commonAnswers.')) {
    return 'add in Settings → Profile → Custom Q&A';
  }
  
  // Generic fallback
  return 'check Settings → Profile';
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
