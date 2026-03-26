/**
 * Settings page: scraper status, expanded user profile, resume overrides, custom autofill keys.
 * @param {HTMLElement} container
 */
import { getUserProfile, setUserProfile } from '../../modules/storage.js';
import { SCRAPER_URL } from '../../lib/constants.js';

export async function renderSettingsPage(container) {
  container.innerHTML = `
    <h1>Settings</h1>
    <p class="text-muted mt-8">Configure your profile, resume corrections, and server connection.</p>

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
      <p class="text-muted text-sm mt-8">Used when forms ask for country, city, state, or postal code.</p>
      <div class="settings-grid mt-12">
        <div>
          <label for="country">Country</label>
          <input type="text" id="country" autocomplete="off" />
        </div>
        <div>
          <label for="city">City</label>
          <input type="text" id="city" autocomplete="off" />
        </div>
        <div>
          <label for="state">State / province</label>
          <input type="text" id="state" autocomplete="off" />
        </div>
        <div>
          <label for="zip">ZIP / postal code</label>
          <input type="text" id="zip" autocomplete="off" />
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
      <button type="button" id="btn-save-profile" class="btn btn-primary">Save profile</button>
      <span id="profile-save-status" class="text-muted text-sm ml-12" role="status"></span>
    </div>
  `;

  await refreshServerStatus(container);
  await loadProfileIntoForm(container);
  wireProfileForm(container);
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
