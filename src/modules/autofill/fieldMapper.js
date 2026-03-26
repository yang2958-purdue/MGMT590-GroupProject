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
 * Map extracted form fields to resume / profile values.
 *
 * @param {FormField[]} formFields  - Fields returned by firecrawlAdapter.extractFormFields.
 * @param {ResumeData|null} resume  - Parsed resume data (may be null).
 * @param {UserProfile|null} userProfile - Stored user profile Q&A.
 * @returns {FilledField[]}
 */
export function mapFields(formFields, resume, userProfile) {
  const lookup = buildLookup(resume, userProfile);

  return formFields.map((field) => {
    if (shouldPause(field)) {
      return { field, value: null, status: 'pause_required' };
    }

    const value = resolveValueForField(field, lookup);

    if (value != null && value !== '') {
      return { field, value: String(value), status: 'ready' };
    }

    return { field, value: null, status: 'skipped' };
  });
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
 * Build a flat key -> value lookup from resume and profile data.
 * @param {ResumeData|null} resume
 * @param {UserProfile|null} profile
 * @returns {Object.<string, string>}
 */
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
  const last = trimStr(ro.lastName);
  const full = trimStr(ro.fullName);

  if (first) map['firstName'] = first;
  if (last) map['lastName'] = last;

  if (full) {
    map['name'] = full;
    const parts = full.split(/\s+/);
    if (!first) map['firstName'] = parts[0] || map['firstName'] || '';
    if (!last) map['lastName'] = parts.slice(1).join(' ') || map['lastName'] || '';
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

  const sch = trimStr(ro.school);
  if (sch) map['education[0].school'] = sch;
  const deg = trimStr(ro.degree);
  if (deg) map['education[0].degree'] = deg;
  const ed = trimStr(ro.eduDates);
  if (ed) map['education[0].dates'] = ed;

  const sk = trimStr(ro.skills);
  if (sk) map['skills'] = sk;
}

function buildLookup(resume, profile) {
  const map = {};

  if (resume) {
    const nameParts = (resume.contact?.name || '').split(/\s+/);
    map['firstName'] = nameParts[0] || '';
    map['lastName'] = nameParts.slice(1).join(' ') || '';
    map['name'] = resume.contact?.name || '';
    map['email'] = resume.contact?.email || '';
    map['phone'] = resume.contact?.phone || '';

    if (resume.experience?.length) {
      const exp = resume.experience[0];
      map['workExperience[0].title'] = exp.title || '';
      map['workExperience[0].company'] = exp.company || '';
      map['workExperience[0].dates'] = exp.dates || '';
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
    map['commonAnswers.city'] = trimStr(profile.city);
    map['commonAnswers.state'] = trimStr(profile.state);
    map['commonAnswers.zip'] = trimStr(profile.zip);

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
  const keysToTry = [];

  const addKey = (k) => {
    if (k && k !== 'unmapped' && !keysToTry.includes(k)) keysToTry.push(k);
  };

  addKey(field.suggestedDataKey);
  for (const k of inferDataKeysToTry(label, field.fieldType)) {
    addKey(k);
  }

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
 * Block obvious type mismatches (e.g. phone string applied to a yes/no select).
 * @param {FormField} field
 * @param {string} val
 * @returns {boolean} true if this value should not be used for this field
 */
function shouldRejectValueForField(field, val) {
  const ft = field.fieldType;
  if (ft !== 'select' && ft !== 'radio') return false;

  if (looksLikeEmail(val)) return true;
  if (looksLikePhone(val)) return true;

  const label = (field.label || '').toLowerCase();
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
