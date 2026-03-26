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
  }

  if (profile) {
    map['linkedin'] = profile.linkedin || map['linkedin'] || '';
    map['coverLetter'] = profile.coverLetter || map['coverLetter'] || '';

    map['commonAnswers.citizenship'] = profile.citizenship || '';
    map['commonAnswers.sponsorship'] = profile.sponsorship || '';
    let workAuth = profile.authorizedToWork || '';
    if (!workAuth && profile.citizenship) workAuth = 'Yes';
    if (!workAuth && profile.sponsorship === 'No') workAuth = 'Yes';
    map['commonAnswers.workAuthorization'] = workAuth;
    map['commonAnswers.salary'] = profile.desiredSalary || '';
    map['commonAnswers.relocation'] = profile.relocation || '';
    map['commonAnswers.sensitiveOptional'] = profile.sensitiveOptional || '';
    map['commonAnswers.country'] = profile.country || '';
    map['commonAnswers.city'] = profile.city || '';
    map['commonAnswers.state'] = profile.state || '';
    map['commonAnswers.zip'] = profile.zip || '';

    if (profile.customAnswers) {
      for (const [k, v] of Object.entries(profile.customAnswers)) {
        map[`commonAnswers.${k}`] = v;
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
