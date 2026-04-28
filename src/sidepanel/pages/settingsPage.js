/**
 * Settings page: scraper status, API keys, expanded user profile, resume overrides, custom autofill keys.
 * @param {HTMLElement} container
 */
import { invalidateApiKeyValidationCache, validateResolvedApiKeys } from '../../lib/apiKeyValidation.js';
import { SCRAPER_URL } from '../../lib/constants.js';
import { getUserProfile, setUserProfile, get, set, remove, KEYS } from '../../modules/storage.js';

export async function renderSettingsPage(container) {
  container.innerHTML = `
    <h1>Settings</h1>
    <p class="text-muted mt-8">Configure API keys, your profile, resume corrections, and server connection.</p>

    <div class="settings-subtabs" role="tablist" aria-label="Settings sections">
      <button type="button" id="tab-profile" class="settings-subtab settings-subtab--active" role="tab" aria-selected="true" aria-controls="panel-profile">Profile</button>
      <button type="button" id="tab-apikeys" class="settings-subtab" role="tab" aria-selected="false" aria-controls="panel-apikeys">API keys</button>
    </div>

    <div id="panel-profile" class="settings-tab-panel" role="tabpanel" aria-labelledby="tab-profile">
    <div class="card mt-16">
      <h3>Scraper Server</h3>
      <p class="text-muted text-sm mt-8">
        The local Python server at <code>http://localhost:5001</code> provides job scraping.
      </p>
      <div id="server-status" class="mt-8">
        <span class="badge badge-amber">Checking...</span>
      </div>
    </div>

    <div class="card mt-16">
      <h3>Application answers</h3>
      <p class="text-muted text-sm mt-8">
        Used for work authorization, sponsorship, and other common ATS questions.
      </p>
      <div class="mt-12">
        <label for="citizenship">Citizenship / work status</label>
        <input type="text" id="citizenship" placeholder="e.g. US Citizen, Permanent Resident" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="authorized-to-work">Authorized to work (Yes / No)</label>
        <select id="authorized-to-work">
          <option value="">— Select —</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
      <div class="mt-12">
        <label for="sponsorship">Requires visa / sponsorship</label>
        <select id="sponsorship">
          <option value="">— Select —</option>
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </div>
      <div class="mt-12">
        <label for="desired-salary">Desired salary</label>
        <input type="text" id="desired-salary" placeholder="e.g. $85,000 – $95,000" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="relocation">Relocation / remote preference</label>
        <input type="text" id="relocation" placeholder="e.g. Open to relocation, Remote only" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="sensitive-optional">Veteran / EEO / similar (optional default)</label>
        <input type="text" id="sensitive-optional" placeholder="e.g. Decline to answer" autocomplete="off" />
      </div>
    </div>

    <div class="card mt-16">
      <h3>Contact &amp; documents</h3>
      <div class="mt-12">
        <label for="linkedin">LinkedIn URL</label>
        <input type="text" id="linkedin" placeholder="https://linkedin.com/in/..." autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="cover-letter">Cover letter (default paste)</label>
        <textarea id="cover-letter" rows="5" placeholder="Optional default text for cover letter fields"></textarea>
      </div>
    </div>

    <div class="card mt-16">
      <h3>Mailing / location</h3>
      <p class="text-muted text-sm mt-8">Used when forms ask for mailing address, city, state, or postal code.</p>
      <div class="mt-12">
        <label for="address">Street address</label>
        <input type="text" id="address" placeholder="e.g. 123 Main St, Apt 4B" autocomplete="street-address" />
      </div>
      <div class="settings-grid mt-12">
        <div>
          <label for="country">Country</label>
          <input type="text" id="country" autocomplete="country-name" />
        </div>
        <div>
          <label for="city">City</label>
          <input type="text" id="city" autocomplete="address-level2" />
        </div>
        <div>
          <label for="state">State / province</label>
          <input type="text" id="state" autocomplete="address-level1" />
        </div>
        <div>
          <label for="zip">ZIP / postal code</label>
          <input type="text" id="zip" autocomplete="postal-code" />
        </div>
      </div>
    </div>

    <div class="card mt-16">
      <h3>Resume corrections</h3>
      <p class="text-muted text-sm mt-8">
        If the resume parser misread a field, enter the correct value here. Non-empty values override parsed resume data during autofill.
      </p>
      <div class="settings-grid mt-12">
        <div>
          <label for="ro-first-name">First name</label>
          <input type="text" id="ro-first-name" autocomplete="given-name" />
        </div>
        <div>
          <label for="ro-last-name">Last name</label>
          <input type="text" id="ro-last-name" autocomplete="family-name" />
        </div>
      </div>
      <div class="mt-12">
        <label for="ro-full-name">Full name (optional)</label>
        <input type="text" id="ro-full-name" autocomplete="name" />
      </div>
      <div class="settings-grid mt-12">
        <div>
          <label for="ro-email">Email</label>
          <input type="text" id="ro-email" autocomplete="email" />
        </div>
        <div>
          <label for="ro-phone">Phone</label>
          <input type="text" id="ro-phone" autocomplete="tel" />
        </div>
      </div>
      <h4 class="settings-subhead mt-16">Most recent role</h4>
      <div class="mt-12">
        <label for="ro-job-title">Job title</label>
        <input type="text" id="ro-job-title" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="ro-company">Company</label>
        <input type="text" id="ro-company" autocomplete="organization" />
      </div>
      <div class="mt-12">
        <label for="ro-work-dates">Dates employed</label>
        <input type="text" id="ro-work-dates" placeholder="e.g. Jan 2020 – Present" autocomplete="off" />
      </div>
      <h4 class="settings-subhead mt-16">Education (first school)</h4>
      <div class="mt-12">
        <label for="ro-school">School</label>
        <input type="text" id="ro-school" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="ro-degree">Degree / field</label>
        <input type="text" id="ro-degree" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="ro-edu-dates">Dates</label>
        <input type="text" id="ro-edu-dates" autocomplete="off" />
      </div>
      <div class="mt-12">
        <label for="ro-skills">Skills (comma-separated)</label>
        <textarea id="ro-skills" rows="3" placeholder="Overrides parsed skills list"></textarea>
      </div>
    </div>

    <div class="card mt-16">
      <h3>Custom autofill keys</h3>
      <p class="text-muted text-sm mt-8">
        Each key becomes <code>commonAnswers.&lt;key&gt;</code> for mapping (e.g. key <code>visaStatus</code> matches suggested keys that resolve to that). Leave a row blank or remove it to omit.
      </p>
      <div id="custom-qa-rows" class="mt-12"></div>
      <button type="button" id="btn-add-custom-qa" class="btn btn-sm mt-8">Add row</button>
    </div>

    <div class="card mt-16">
      <div class="flex gap-8 flex-wrap align-start">
        <button type="button" id="btn-save-profile" class="btn btn-primary">Save profile</button>
        <button type="button" id="btn-clear-profile" class="btn btn-danger">Clear profile data</button>
      </div>
      <p class="text-muted text-sm mt-8">
        Clearing profile data also clears saved resume data. API keys are retained and must be cleared separately in the API keys tab.
      </p>
      <span id="profile-save-status" class="text-muted text-sm ml-12" role="status"></span>
    </div>
    </div>

    <div id="panel-apikeys" class="settings-tab-panel" role="tabpanel" aria-labelledby="tab-apikeys" hidden>
    <div id="api-keys-validation-banner" class="card mt-16">
      <h3>Key checks</h3>
      <p id="api-keys-validation-status" class="text-muted text-sm mt-8">Open this tab to verify keys.</p>
      <div id="api-keys-validation-details" class="mt-12"></div>
    </div>

    <div class="card mt-16">
      <h3>About API keys</h3>
      <p class="text-muted text-sm mt-8">
        Keys are stored in <code>chrome.storage.local</code> for this browser profile. They are not synced to the Python server except OpenAI: the extension sends your OpenAI key to the local server only in request headers when you use LLM features.
      </p>
      <ul class="text-muted text-sm mt-8" style="padding-left:1.25rem;">
        <li><strong>Firecrawl:</strong> extension storage first, then <code>VITE_FIRECRAWL_API_KEY</code> at build time if storage is empty.</li>
        <li><strong>OpenAI:</strong> extension storage first (sent to <code>localhost:5001</code>); if not set, the server uses <code>OPENAI_API_KEY</code> from its <code>.env</code>.</li>
      </ul>
    </div>

    <div class="card mt-16">
      <h3>Firecrawl API key</h3>
      <p id="api-key-firecrawl-status" class="text-muted text-sm mt-8"></p>
      <div class="mt-12">
        <label for="api-key-firecrawl">Key</label>
        <input type="password" id="api-key-firecrawl" autocomplete="off" spellcheck="false" placeholder="Paste key to save (hidden)" />
      </div>
      <div class="mt-12 flex gap-8 flex-wrap align-start">
        <button type="button" id="btn-save-api-firecrawl" class="btn btn-sm btn-primary">Save</button>
        <button type="button" id="btn-clear-api-firecrawl" class="btn btn-sm btn-danger">Clear stored key</button>
      </div>
    </div>

    <div class="card mt-16">
      <h3>OpenAI API key</h3>
      <p id="api-key-openai-status" class="text-muted text-sm mt-8"></p>
      <div class="mt-12">
        <label for="api-key-openai">Key</label>
        <input type="password" id="api-key-openai" autocomplete="off" spellcheck="false" placeholder="Paste key to save (hidden)" />
      </div>
      <div class="mt-12 flex gap-8 flex-wrap align-start">
        <button type="button" id="btn-save-api-openai" class="btn btn-sm btn-primary">Save</button>
        <button type="button" id="btn-clear-api-openai" class="btn btn-sm btn-danger">Clear stored key</button>
      </div>
    </div>

    <p id="api-keys-save-status" class="text-muted text-sm mt-16" role="status"></p>
    </div>
  `;

  wireSettingsTabs(container);
  await refreshServerStatus(container);
  await loadProfileIntoForm(container);
  wireProfileForm(container);
  await refreshApiKeyStatus(container);
  wireApiKeysForm(container);
}

/**
 * @param {HTMLElement} container
 */
function wireSettingsTabs(container) {
  const btnProfile = container.querySelector('#tab-profile');
  const btnApi = container.querySelector('#tab-apikeys');
  const panelProfile = container.querySelector('#panel-profile');
  const panelApi = container.querySelector('#panel-apikeys');

  /**
   * @param {'profile' | 'apikeys'} name
   */
  function show(name) {
    const profile = name === 'profile';
    if (panelProfile) panelProfile.hidden = !profile;
    if (panelApi) panelApi.hidden = profile;
    btnProfile?.classList.toggle('settings-subtab--active', profile);
    btnApi?.classList.toggle('settings-subtab--active', !profile);
    btnProfile?.setAttribute('aria-selected', profile ? 'true' : 'false');
    btnApi?.setAttribute('aria-selected', profile ? 'false' : 'true');
  }

  btnProfile?.addEventListener('click', () => show('profile'));
  btnApi?.addEventListener('click', () => {
    show('apikeys');
    void refreshApiKeyValidation(container);
  });
}

/**
 * @param {HTMLElement} container
 */
async function refreshApiKeyStatus(container) {
  const fc = await get(KEYS.FIRECRAWL_API_KEY);
  const oa = await get(KEYS.OPENAI_API_KEY);
  const hasFc = fc != null && String(fc).trim().length > 0;
  const hasOa = oa != null && String(oa).trim().length > 0;

  const elFc = container.querySelector('#api-key-firecrawl-status');
  const elOa = container.querySelector('#api-key-openai-status');
  if (elFc) {
    elFc.textContent = hasFc
      ? 'A Firecrawl key is saved in this browser. Enter a new value and Save to replace it.'
      : 'No key in storage. You can set VITE_FIRECRAWL_API_KEY at build time instead.';
  }
  if (elOa) {
    elOa.textContent = hasOa
      ? 'An OpenAI key is saved in this browser. Enter a new value and Save to replace it.'
      : 'No key in storage. The Python server can use OPENAI_API_KEY from its .env instead.';
  }
}

/**
 * Live validation against Firecrawl / OpenAI (and server health for OpenAI fallback).
 * @param {HTMLElement} container
 */
async function refreshApiKeyValidation(container) {
  const statusEl = container.querySelector('#api-keys-validation-status');
  const body = container.querySelector('#api-keys-validation-details');
  if (statusEl) statusEl.textContent = 'Checking keys…';
  if (body) body.innerHTML = '';

  try {
    invalidateApiKeyValidationCache();
    const { firecrawl, openai } = await validateResolvedApiKeys();

    const problem = (s) => !s.ok && s.kind !== 'missing';
    const warnOnly = (s) => !s.ok && s.kind === 'missing';
    const hasProblem = problem(firecrawl) || problem(openai);
    const hasWarn = warnOnly(firecrawl) || warnOnly(openai);

    if (statusEl) {
      if (hasProblem) statusEl.textContent = 'Invalid or unreachable key — see below.';
      else if (hasWarn) statusEl.textContent = 'Some keys are unset — optional features may be limited.';
      else statusEl.textContent = 'Checked keys look good.';
    }

    if (body) {
      body.innerHTML = [renderValidationRow('Firecrawl', firecrawl), renderValidationRow('OpenAI', openai)].join('');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (statusEl) statusEl.textContent = 'Validation failed.';
    if (body) body.innerHTML = `<p class="api-key-line api-key-line--err">${esc(msg)}</p>`;
  }
}

/**
 * @param {string} label
 * @param {{ ok: boolean; kind: string; message: string }} slice
 */
function renderValidationRow(label, slice) {
  const okish = slice.ok || slice.kind === 'server';
  const cls = okish
    ? 'api-key-line--ok'
    : slice.kind === 'missing'
      ? 'api-key-line--warn'
      : 'api-key-line--err';
  return `<p class="api-key-line ${cls}"><strong>${esc(label)}</strong> — ${esc(slice.message)}</p>`;
}

/**
 * @param {HTMLElement} container
 */
function wireApiKeysForm(container) {
  const status = container.querySelector('#api-keys-save-status');

  const saveFc = container.querySelector('#btn-save-api-firecrawl');
  const saveOa = container.querySelector('#btn-save-api-openai');
  const clearFc = container.querySelector('#btn-clear-api-firecrawl');
  const clearOa = container.querySelector('#btn-clear-api-openai');

  saveFc?.addEventListener('click', async () => {
    const raw = container.querySelector('#api-key-firecrawl')?.value?.trim() ?? '';
    if (!raw) {
      if (status) status.textContent = 'Enter a Firecrawl key before saving.';
      return;
    }
    if (status) status.textContent = 'Saving…';
    try {
      await set(KEYS.FIRECRAWL_API_KEY, raw);
      const input = container.querySelector('#api-key-firecrawl');
      if (input) input.value = '';
      await refreshApiKeyStatus(container);
      invalidateApiKeyValidationCache();
      await refreshApiKeyValidation(container);
      if (status) status.textContent = 'Firecrawl key saved.';
      setTimeout(() => {
        if (status?.textContent === 'Firecrawl key saved.') status.textContent = '';
      }, 2500);
    } catch (e) {
      if (status) status.textContent = 'Save failed.';
      console.error(e);
    }
  });

  saveOa?.addEventListener('click', async () => {
    const raw = container.querySelector('#api-key-openai')?.value?.trim() ?? '';
    if (!raw) {
      if (status) status.textContent = 'Enter an OpenAI key before saving.';
      return;
    }
    if (status) status.textContent = 'Saving…';
    try {
      await set(KEYS.OPENAI_API_KEY, raw);
      const input = container.querySelector('#api-key-openai');
      if (input) input.value = '';
      await refreshApiKeyStatus(container);
      invalidateApiKeyValidationCache();
      await refreshApiKeyValidation(container);
      if (status) status.textContent = 'OpenAI key saved.';
      setTimeout(() => {
        if (status?.textContent === 'OpenAI key saved.') status.textContent = '';
      }, 2500);
    } catch (e) {
      if (status) status.textContent = 'Save failed.';
      console.error(e);
    }
  });

  clearFc?.addEventListener('click', async () => {
    const ok = globalThis.confirm(
      'Clear stored Firecrawl API key? This only removes the API key. Profile data remains unchanged.',
    );
    if (!ok) return;
    if (status) status.textContent = 'Clearing…';
    try {
      await remove(KEYS.FIRECRAWL_API_KEY);
      await refreshApiKeyStatus(container);
      invalidateApiKeyValidationCache();
      await refreshApiKeyValidation(container);
      if (status) status.textContent = 'Firecrawl key cleared.';
      setTimeout(() => {
        if (status?.textContent === 'Firecrawl key cleared.') status.textContent = '';
      }, 2500);
    } catch (e) {
      if (status) status.textContent = 'Clear failed.';
      console.error(e);
    }
  });

  clearOa?.addEventListener('click', async () => {
    const ok = globalThis.confirm(
      'Clear stored OpenAI API key? This only removes the API key. Profile data remains unchanged.',
    );
    if (!ok) return;
    if (status) status.textContent = 'Clearing…';
    try {
      await remove(KEYS.OPENAI_API_KEY);
      await refreshApiKeyStatus(container);
      invalidateApiKeyValidationCache();
      await refreshApiKeyValidation(container);
      if (status) status.textContent = 'OpenAI key cleared.';
      setTimeout(() => {
        if (status?.textContent === 'OpenAI key cleared.') status.textContent = '';
      }, 2500);
    } catch (e) {
      if (status) status.textContent = 'Clear failed.';
      console.error(e);
    }
  });
}

/**
 * @param {string} s
 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * @param {HTMLElement} container
 */
async function refreshServerStatus(container) {
  const el = container.querySelector('#server-status');
  if (!el) return;
  el.innerHTML = '<span class="badge badge-amber">Checking...</span>';
  try {
    const r = await fetch(`${SCRAPER_URL}/health`, { method: 'GET' });
    if (r.ok) {
      el.innerHTML = '<span class="badge badge-green">Connected</span>';
    } else {
      el.innerHTML =
        '<span class="badge badge-red">Unreachable</span><p class="text-muted text-sm mt-8">Server returned an error.</p>';
    }
  } catch {
    el.innerHTML =
      '<span class="badge badge-red">Unreachable</span><p class="text-muted text-sm mt-8">Start the Python server (see README).</p>';
  }
}

/**
 * @param {HTMLElement} container
 */
function wireProfileForm(container) {
  const rowsHost = container.querySelector('#custom-qa-rows');
  const addBtn = container.querySelector('#btn-add-custom-qa');
  const saveBtn = container.querySelector('#btn-save-profile');
  const clearBtn = container.querySelector('#btn-clear-profile');

  addBtn?.addEventListener('click', () => {
    addCustomRow(rowsHost, '', '');
  });

  saveBtn?.addEventListener('click', async () => {
    const status = container.querySelector('#profile-save-status');
    if (status) status.textContent = 'Saving…';
    try {
      const profile = readProfileFromForm(container);
      await setUserProfile(profile);
      if (status) status.textContent = 'Saved.';
      setTimeout(() => {
        if (status?.textContent === 'Saved.') status.textContent = '';
      }, 2500);
    } catch (e) {
      if (status) status.textContent = 'Save failed.';
      console.error(e);
    }
  });

  clearBtn?.addEventListener('click', async () => {
    const status = container.querySelector('#profile-save-status');
    const ok = globalThis.confirm(
      'Are you sure you want to clear profile data? This clears Profile tab data (including custom fields) and saved resume data. API keys are NOT cleared and must be removed separately in the API keys tab.',
    );
    if (!ok) return;
    if (status) status.textContent = 'Clearing…';
    try {
      await remove(KEYS.USER_PROFILE);
      await remove(KEYS.RESUME);
      resetProfileForm(container);
      if (status) status.textContent = 'Profile and resume data cleared. API keys are still saved unless cleared separately.';
      setTimeout(() => {
        if (status?.textContent === 'Profile and resume data cleared. API keys are still saved unless cleared separately.') {
          status.textContent = '';
        }
      }, 3500);
    } catch (e) {
      if (status) status.textContent = 'Clear failed.';
      console.error(e);
    }
  });
}

/**
 * Clear all profile form inputs and reset custom Q&A rows.
 * @param {HTMLElement} container
 */
function resetProfileForm(container) {
  container.querySelectorAll('#panel-profile input, #panel-profile textarea, #panel-profile select').forEach((el) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
      return;
    }
    if (el.id === 'api-key-firecrawl' || el.id === 'api-key-openai') return;
    el.value = '';
  });

  const host = container.querySelector('#custom-qa-rows');
  if (host) {
    host.innerHTML = '';
    addCustomRow(host, '', '');
  }
}

/**
 * @param {HTMLElement|null} host
 * @param {string} key
 * @param {string} val
 */
function addCustomRow(host, key, val) {
  if (!host) return;
  const row = document.createElement('div');
  row.className = 'custom-qa-row flex gap-8 mt-8 align-start';
  row.innerHTML = `
    <input type="text" class="flex-1 custom-qa-key" placeholder="Key (e.g. visaStatus)" value="${esc(key)}" />
    <input type="text" class="flex-1 custom-qa-val" placeholder="Answer" value="${esc(val)}" />
    <button type="button" class="btn btn-sm btn-remove-custom flex-noshrink">Remove</button>
  `;
  row.querySelector('.btn-remove-custom')?.addEventListener('click', () => {
    const rows = host.querySelectorAll('.custom-qa-row');
    if (rows.length <= 1) {
      row.querySelector('.custom-qa-key').value = '';
      row.querySelector('.custom-qa-val').value = '';
      return;
    }
    row.remove();
  });
  host.appendChild(row);
}

/**
 * @param {HTMLElement} container
 */
function readProfileFromForm(container) {
  const val = (id) => container.querySelector(`#${id}`)?.value?.trim() ?? '';

  const resumeOverrides = {};
  const roFields = [
    ['firstName', 'ro-first-name'],
    ['lastName', 'ro-last-name'],
    ['fullName', 'ro-full-name'],
    ['email', 'ro-email'],
    ['phone', 'ro-phone'],
    ['jobTitle', 'ro-job-title'],
    ['company', 'ro-company'],
    ['workDates', 'ro-work-dates'],
    ['school', 'ro-school'],
    ['degree', 'ro-degree'],
    ['eduDates', 'ro-edu-dates'],
    ['skills', 'ro-skills'],
  ];
  for (const [k, id] of roFields) {
    const raw = container.querySelector(`#${id}`)?.value?.trim() ?? '';
    if (raw) resumeOverrides[k] = raw;
  }

  const customAnswers = {};
  container.querySelectorAll('.custom-qa-row').forEach((row) => {
    const k = row.querySelector('.custom-qa-key')?.value?.trim() ?? '';
    const v = row.querySelector('.custom-qa-val')?.value?.trim() ?? '';
    if (k) customAnswers[k] = v;
  });

  const profile = {
    citizenship: val('citizenship'),
    authorizedToWork: val('authorized-to-work'),
    sponsorship: val('sponsorship'),
    desiredSalary: val('desired-salary'),
    relocation: val('relocation'),
    sensitiveOptional: val('sensitive-optional'),
    linkedin: val('linkedin'),
    coverLetter: container.querySelector('#cover-letter')?.value?.trim() ?? '',
    address: val('address'),
    country: val('country'),
    city: val('city'),
    state: val('state'),
    zip: val('zip'),
  };

  if (Object.keys(resumeOverrides).length) {
    profile.resumeOverrides = resumeOverrides;
  }
  if (Object.keys(customAnswers).length) {
    profile.customAnswers = customAnswers;
  }

  return profile;
}

/**
 * @param {HTMLElement} container
 */
async function loadProfileIntoForm(container) {
  const p = await getUserProfile();
  const setVal = (id, v) => {
    const el = container.querySelector(`#${id}`);
    if (el) el.value = v ?? '';
  };

  if (!p) {
    const host = container.querySelector('#custom-qa-rows');
    addCustomRow(host, '', '');
    return;
  }

  setVal('citizenship', p.citizenship);
  setVal('authorized-to-work', p.authorizedToWork || '');
  setVal('sponsorship', normalizeSelectYesNo(p.sponsorship));
  setVal('desired-salary', p.desiredSalary);
  setVal('relocation', p.relocation);
  setVal('sensitive-optional', p.sensitiveOptional);
  setVal('linkedin', p.linkedin);
  setVal('cover-letter', p.coverLetter);

  setVal('address', p.address);
  setVal('country', p.country);
  setVal('city', p.city);
  setVal('state', p.state);
  setVal('zip', p.zip);

  const ro = p.resumeOverrides || {};
  setVal('ro-first-name', ro.firstName);
  setVal('ro-last-name', ro.lastName);
  setVal('ro-full-name', ro.fullName);
  setVal('ro-email', ro.email);
  setVal('ro-phone', ro.phone);
  setVal('ro-job-title', ro.jobTitle);
  setVal('ro-company', ro.company);
  setVal('ro-work-dates', ro.workDates);
  setVal('ro-school', ro.school);
  setVal('ro-degree', ro.degree);
  setVal('ro-edu-dates', ro.eduDates);
  setVal('ro-skills', ro.skills);

  const host = container.querySelector('#custom-qa-rows');
  const entries = p.customAnswers && Object.keys(p.customAnswers).length ? Object.entries(p.customAnswers) : [];
  if (entries.length) {
    for (const [k, v] of entries) {
      addCustomRow(host, k, v);
    }
  }
  addCustomRow(host, '', '');
}

/**
 * @param {string} [s]
 */
function normalizeSelectYesNo(s) {
  const t = (s || '').trim();
  if (/^yes$/i.test(t)) return 'Yes';
  if (/^no$/i.test(t)) return 'No';
  return t;
}
