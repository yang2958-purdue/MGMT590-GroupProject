/**
 * Field mapper module.
 *
 * Pure function that takes extracted form fields and maps each one to a value
 * from the parsed resume or user profile, producing a FilledField array with
 * statuses: "ready", "skipped", or "pause_required".
 */

import { PAUSE_TRIGGER_KEYWORDS } from '../../config/autofill.config.js';
import { inferDataKeysToTry, labelLooksLikeYesNo } from './fieldInference.js';

/**
 * @typedef {import('../scraper/firecrawlAdapter.js').FormField} FormField
 * @typedef {import('../resumeParser.js').ResumeData} ResumeData
 * @typedef {import('../storage.js').UserProfile} UserProfile
 */

/**
 * @typedef {Object} FilledField
 * @property {FormField} field       - The original extracted form field.
 * @property {string|null} value     - The value to fill, or null.
 * @property {"ready"|"skipped"|"pause_required"} status
 */

/**
 * True when the label is only the US state / province field (not "country and state" combined rows).
 * @param {string|undefined} label
 */
function labelIsStateOnlyField(label) {
  const t = String(label || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!/\bstate\b/.test(t)) return false;
  return (
    /^state\*?$/.test(t) ||
    /^state\s*\*?$/.test(t) ||
    /^state\s*\/\s*province$/i.test(t) ||
    /^state\s+or\s+province$/i.test(t)
  );
}

/**
 * @param {string|undefined} label
 */
function labelIsPhoneDeviceTypeField(label) {
  const t = String(label || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return (
    /\bphone\b/.test(t) &&
    /\bdevice\b/.test(t) &&
    /\btype\b/.test(t) &&
    !/\bphone\s+number\b/.test(t)
  );
}

/**
 * Map extracted form fields to resume / profile values.
 *
 * @param {FormField[]} formFields  - Fields returned by firecrawlAdapter.extractFormFields.
 * @param {ResumeData|null} resume  - Parsed resume data (may be null).
 * @param {UserProfile|null} userProfile - Stored user profile Q&A.
 * @returns {FilledField[]}
 */
export function mapFields(formFields, resume, userProfile) {
  normalizeWorkExperienceFieldKeys(formFields);

  const lookup = buildLookup(resume, userProfile);

  const hasStateDropdown = formFields.some(
    (f) => f.fieldType === 'select' && labelIsStateOnlyField(f.label),
  );
  const hasPhoneDeviceTypeDropdown = formFields.some(
    (f) => f.fieldType === 'select' && labelIsPhoneDeviceTypeField(f.label),
  );

  const filledFields = formFields.map((field) => {
    if (shouldPause(field)) {
      return { field, value: null, status: 'pause_required' };
    }

    // Workday often exposes a listbox (select) plus a second mirrored control (input).
    // Filling the text input with "IL" after the dropdown commits can clear the selection (runtime logs
    // showed State* select then State* input both ready with the same 2-letter value).
    if (hasStateDropdown && field.fieldType === 'input' && labelIsStateOnlyField(field.label)) {
      return { field, value: null, status: 'skipped' };
    }

    if (hasPhoneDeviceTypeDropdown && field.fieldType === 'input' && labelIsPhoneDeviceTypeField(field.label)) {
      return { field, value: null, status: 'skipped' };
    }

    const value = resolveValueForField(field, lookup);

    if (value != null && value !== '') {
      return { field, value: String(value), status: 'ready' };
    }

    return { field, value: null, status: 'skipped' };
  });

  return filledFields;
}

// ─── Pause-trigger detection ────────────────────────────────────

/**
 * Check whether a field's label matches any pause-trigger keyword.
 * Uses case-insensitive substring matching.
 * @param {FormField} field
 * @returns {boolean}
 */
function shouldPause(field) {
  const label = (field.label || '').toLowerCase();

  // TODO: LLM-based field inference — augment keyword matching with an LLM
  // call that classifies ambiguous fields as safe vs. pause-required.

  return PAUSE_TRIGGER_KEYWORDS.some((kw) => label.includes(kw.toLowerCase()));
}

// ─── Value resolution ───────────────────────────────────────────

/**
 * Remap `workExperience[0].*` candidate keys to the repeater row index when known (Workday DOM).
 * @param {string|undefined} key
 * @param {number|undefined} wxIdx
 * @returns {string|undefined}
 */
function remapWorkExperienceKey(key, wxIdx) {
  if (wxIdx == null || key == null || typeof key !== 'string') return key;
  return key.replace(/^workExperience\[\d+\]/, `workExperience[${wxIdx}]`);
}

function collectCandidateKeys(field) {
  const wxIdx = field.wxResumeIndex;
  const keysToTry = [];
  const addKey = (k) => {
    const k2 = remapWorkExperienceKey(k, wxIdx);
    if (k2 && k2 !== 'unmapped' && !keysToTry.includes(k2)) keysToTry.push(k2);
  };
  addKey(field.suggestedDataKey);
  for (const k of inferDataKeysToTry(field.label || '', field.fieldType)) {
    addKey(k);
  }
  return keysToTry;
}

/**
 * Workday uses internal ids (e.g. workExperience-11--jobTitle). Map sorted ids to resume indices 0..n-1.
 * @param {import('../scraper/firecrawlAdapter.js').FormField[]} formFields
 */
function normalizeWorkExperienceFieldKeys(formFields) {
  const allNs = new Set();
  for (const f of formFields) {
    const blob = f.inferenceSource || [f.label, f.selector, f.suggestedDataKey].filter(Boolean).join(' ');
    for (const n of extractWorkexperienceIdsFromBlob(blob)) {
      allNs.add(n);
    }
  }
  const sortedNs = [...allNs].sort((a, b) => a - b);

  for (const f of formFields) {
    const blob = f.inferenceSource || [f.label, f.selector, f.suggestedDataKey].filter(Boolean).join(' ');
    const ids = extractWorkexperienceIdsFromBlob(blob);
    const N = ids.length ? ids[0] : null;
    if (N == null) {
      delete f.wxResumeIndex;
      continue;
    }
    const idx = sortedNs.indexOf(N);
    if (idx >= 0) {
      f.wxResumeIndex = idx;
    } else {
      delete f.wxResumeIndex;
    }
  }
}

/**
 * @param {string} blob
 * @returns {number[]}
 */
function extractWorkexperienceIdsFromBlob(blob) {
  const compact = String(blob || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const out = [];
  const re = /workexperience(\d+)/g;
  let m;
  while ((m = re.exec(compact)) !== null) {
    out.push(parseInt(m[1], 10));
  }
  return out;
}

/**
 * @param {string|undefined} s
 */
function trimStr(s) {
  if (s == null) return '';
  return String(s).trim();
}

/**
 * Normalize Yes/No style answers from profile (handles legacy lowercase).
 * @param {string} s
 * @returns {string}
 */
function normalizeYesNoToken(s) {
  const t = trimStr(s);
  if (/^yes$/i.test(t)) return 'Yes';
  if (/^no$/i.test(t)) return 'No';
  return t;
}

/**
 * Apply manual resume corrections; non-empty fields override `map`.
 * @param {Object.<string, string>} map
 * @param {import('../storage.js').ResumeFieldOverrides|null|undefined} ro
 */
function applyResumeOverrides(map, ro) {
  if (!ro) return;

  const first = trimStr(ro.firstName);
  const middle = trimStr(ro.middleName);
  const last = trimStr(ro.lastName);
  const full = trimStr(ro.fullName);

  if (first) map['firstName'] = first;
  if (middle) map['middleName'] = middle;
  if (last) map['lastName'] = last;

  if (full) {
    const parsed = splitNameParts(full);
    map['name'] = full;
    if (!first) map['firstName'] = parsed.firstName || map['firstName'] || '';
    if (!middle) map['middleName'] = parsed.middleName || map['middleName'] || '';
    if (!last) map['lastName'] = parsed.lastName || map['lastName'] || '';
  } else if (first || last) {
    map['name'] = [first, last].filter(Boolean).join(' ');
  }

  const email = trimStr(ro.email);
  if (email) map['email'] = email;
  const phone = trimStr(ro.phone);
  if (phone) map['phone'] = phone;

  const jt = trimStr(ro.jobTitle);
  if (jt) map['workExperience[0].title'] = jt;
  const co = trimStr(ro.company);
  if (co) map['workExperience[0].company'] = co;
  const wd = trimStr(ro.workDates);
  if (wd) map['workExperience[0].dates'] = wd;
  const wl = trimStr(ro.workLocation);
  if (wl) map['workExperience[0].location'] = wl;

  const sch = trimStr(ro.school);
  if (sch) map['education[0].school'] = sch;
  const deg = trimStr(ro.degree);
  if (deg) map['education[0].degree'] = deg;
  const ed = trimStr(ro.eduDates);
  if (ed) map['education[0].dates'] = ed;

  const sk = trimStr(ro.skills);
  if (sk) map['skills'] = sk;
}

const MONTH_WORD_TO_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Normalize one date fragment to MM/YYYY for Workday month pickers.
 * @param {string} tok
 * @returns {string}
 */
function parseMonthYearToken(tok) {
  const t = String(tok || '').trim();
  if (!t) return '';
  let m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Math.min(12, Math.max(1, parseInt(m[1], 10)));
    return `${String(mm).padStart(2, '0')}/${m[2]}`;
  }
  m = t.match(/^([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const mi = MONTH_WORD_TO_INDEX[m[1].toLowerCase()];
    if (mi != null) return `${String(mi + 1).padStart(2, '0')}/${m[2]}`;
  }
  m = t.match(/^(\d{4})$/);
  if (m) return `01/${m[1]}`;
  return '';
}

/**
 * Split a combined experience date line (e.g. "Aug 2020 – Present") into Workday From/To.
 * @param {string} raw
 * @returns {{ start: string, end: string }}
 */
function splitExperienceDatesForWorkday(raw) {
  const s = String(raw || '').trim();
  if (!s) return { start: '', end: '' };
  const present = /\b(present|current|now)\b/i;
  const normalized = s.replace(/\s+/g, ' ').replace(/[–—]/g, '-');
  const parts = normalized
    .split(/\s*-\s*|\s+to\s+|\s+through\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  let start = '';
  let end = '';
  if (parts.length >= 1) {
    start = parseMonthYearToken(parts[0]);
  }
  if (parts.length >= 2) {
    end = present.test(parts[1]) ? '' : parseMonthYearToken(parts[1]);
  }
  if (!start && !end) {
    start = parseMonthYearToken(s);
  }
  return { start, end };
}

function buildLookup(resume, profile) {
  const map = {};

  if (resume) {
    const parsedName = splitNameParts(resume.contact?.name || '');
    map['firstName'] = parsedName.firstName;
    map['middleName'] = parsedName.middleName;
    map['lastName'] = parsedName.lastName;
    map['name'] = resume.contact?.name || '';
    map['email'] = resume.contact?.email || '';
    map['phone'] = resume.contact?.phone || '';
    map['commonAnswers.city'] = resume.location?.city || '';
    map['commonAnswers.state'] = resume.location?.state || '';
    map['commonAnswers.zip'] = resume.location?.zip || '';

    if (resume.experience?.length) {
      resume.experience.forEach((exp, i) => {
        const prefix = `workExperience[${i}]`;
        map[`${prefix}.title`] = exp.title || '';
        map[`${prefix}.company`] = exp.company || '';
        map[`${prefix}.dates`] = exp.dates || '';
        const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
        map[`${prefix}.description`] = bullets
          .map((b) => String(b).trim())
          .filter(Boolean)
          .join('\n\n');
        map[`${prefix}.location`] = trimStr(exp.location || '');
        const { start, end } = splitExperienceDatesForWorkday(exp.dates || '');
        map[`${prefix}.startDate`] = start;
        map[`${prefix}.endDate`] = end;
        if (/\b(present|current|now)\b/i.test(String(exp.dates || ''))) {
          map[`${prefix}.currentlyEmployed`] = 'Yes';
        }
      });
    }

    if (resume.education?.length) {
      const edu = resume.education[0];
      map['education[0].school'] = edu.school || '';
      map['education[0].degree'] = edu.degree || '';
      map['education[0].dates'] = edu.dates || '';
    }

    map['skills'] = (resume.skills || []).join(', ');
    map['coverLetter'] = '';
  } else {
    map['coverLetter'] = '';
  }

  applyResumeOverrides(map, profile?.resumeOverrides);

  if (profile) {
    map['linkedin'] = trimStr(profile.linkedin) || map['linkedin'] || '';
    map['coverLetter'] = trimStr(profile.coverLetter) || map['coverLetter'] || '';

    map['commonAnswers.citizenship'] = trimStr(profile.citizenship);
    map['commonAnswers.sponsorship'] = normalizeYesNoToken(profile.sponsorship);
    let workAuth = trimStr(profile.authorizedToWork);
    if (/^yes$/i.test(workAuth)) workAuth = 'Yes';
    else if (/^no$/i.test(workAuth)) workAuth = 'No';
    if (!workAuth && profile.citizenship) workAuth = 'Yes';
    if (!workAuth && map['commonAnswers.sponsorship'] === 'No') workAuth = 'Yes';
    map['commonAnswers.workAuthorization'] = workAuth;
    map['commonAnswers.salary'] = trimStr(profile.desiredSalary);
    map['commonAnswers.relocation'] = trimStr(profile.relocation);
    map['commonAnswers.sensitiveOptional'] = trimStr(profile.sensitiveOptional);
    map['commonAnswers.country'] = trimStr(profile.country);
    if (trimStr(profile.city)) map['commonAnswers.city'] = trimStr(profile.city);
    if (trimStr(profile.state)) map['commonAnswers.state'] = trimStr(profile.state);
    if (trimStr(profile.zip)) map['commonAnswers.zip'] = trimStr(profile.zip);

    if (profile.customAnswers) {
      for (const [k, v] of Object.entries(profile.customAnswers)) {
        const key = trimStr(k);
        if (!key) continue;
        map[`commonAnswers.${key}`] = trimStr(v);
      }
    }
  }

  return map;
}

/**
 * @param {FormField} field
 * @param {Object.<string, string>} lookup
 * @returns {string|null}
 */
function resolveValueForField(field, lookup) {
  const label = field.label || '';
  const hardcodedValue = getHardcodedValueForField(field);
  if (hardcodedValue) return hardcodedValue;
  const keysToTry = collectCandidateKeys(field);

  for (const key of keysToTry) {
    const raw = lookup[key];
    if (raw == null || raw === '') continue;
    const s = String(raw).trim();
    if (!s) continue;
    if (shouldRejectValueForField(field, s)) continue;
    return s;
  }

  return null;
}

/**
 * Hardcoded values for specific known form labels.
 * @param {FormField} field
 * @returns {string|null}
 */
function getHardcodedValueForField(field) {
  const haystack = [
    field.label || '',
    field.selector || '',
    field.suggestedDataKey || '',
  ]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (
    !/\bphone\s+number\b/.test(haystack) &&
    !/\bphone\s+type\b/.test(haystack) &&
    (/phone\s*device\s*type/.test(haystack) ||
      /\bphone\s+device\b/.test(haystack) ||
      (/\bphone\b/.test(haystack) && /\bdevice\b/.test(haystack) && /\btype\b/.test(haystack)))
  ) {
    return 'Mobile';
  }

  if (
    /country\s*\/\s*territory\s*phone\s*code/.test(haystack) ||
    (/country/.test(haystack) && /phone/.test(haystack) && /code/.test(haystack))
  ) {
    return 'United States of America (+1)';
  }

  return null;
}

/**
 * Block obvious type mismatches (e.g. phone string applied to a yes/no select).
 * @param {FormField} field
 * @param {string} val
 * @returns {boolean} true if this value should not be used for this field
 */
function shouldRejectValueForField(field, val) {
  const label = (field.label || '').toLowerCase();
  const ft = field.fieldType;
  const trimmed = String(val || '').trim();

  if (ft === 'input' || ft === 'textarea') {
    if (/\bmiddle\s*name\b|\bmiddle\s*initial\b/.test(label) && /\s/.test(trimmed)) return true;
    if (/\b(zip|postal|post code)\b/.test(label) && looksLikePhone(trimmed)) return true;
    if (/\b(phone\s*extension|extension|ext\.?)\b/.test(label) && looksLikePhone(trimmed)) return true;
    if (/\b(phone\s*code|country\s*code|dial(?:ing)?\s*code)\b/.test(label) && looksLikePhone(trimmed)) return true;
  }

  if (ft !== 'select' && ft !== 'radio') return false;

  if (looksLikeEmail(val)) return true;
  if (looksLikePhone(val)) return true;

  const sponsorish = /sponsor|visa|h-1|h1b|immigration/.test(label);

  if (labelLooksLikeYesNo(field.label || '') && !sponsorish) {
    if (val.length > 60) return true;
    if (val.length > 20 && !looksLikeShortChoiceAnswer(val)) return true;
  }

  return false;
}

function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikePhone(s) {
  const digits = s.replace(/\D/g, '');
  return digits.length >= 10;
}

function looksLikeShortChoiceAnswer(s) {
  const t = s.trim().toLowerCase();
  if (t.length <= 24) return true;
  return /^(yes|no|y|n|true|false|prefer not|decline|n\/a)\b/i.test(t);
}

/**
 * Split full name into first/middle/last with middle initial support.
 * @param {string} fullName
 */
function splitNameParts(fullName) {
  const parts = trimStr(fullName).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}
