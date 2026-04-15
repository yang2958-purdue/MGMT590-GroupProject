/**
 * Shared label + control-type heuristics for mapping form fields to resume/profile keys.
 * Used by domFieldScanner (suggestedDataKey) and fieldMapper (fallback when key misses).
 */

/**
 * Normalize text for matching.
 * @param {string} s
 */
function norm(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} labelText
 * @param {'input'|'select'|'textarea'|'checkbox'|'radio'} fieldType
 * @returns {string} Lookup key used by fieldMapper buildLookup (not 'commonAnswers.custom' unless truly unknown).
 */
/**
 * Education repeater scope (e.g. education-0--fromDate) — must win over generic From/To.
 * @param {string} labelText
 * @returns {string|null}
 */
function inferEducationScopedKey(labelText) {
  const compact = String(labelText || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  // Workday uses education-0--, education-1--, etc.
  if (!/education\d+/.test(compact)) return null;
  if (
    compact.includes('from') ||
    compact.includes('todate') ||
    compact.includes('startdate') ||
    compact.includes('enddate')
  ) {
    return 'education[0].dates';
  }
  return null;
}

/**
 * Workday repeaters embed scope in `name` / `aria-label` (e.g. workExperience-0--fromDate).
 * @param {string} labelText
 * @returns {string|null}
 */
function inferWorkExperienceScopedKey(labelText) {
  const raw = String(labelText || '');
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  // Workday uses workExperience-0--, workExperience-11--, etc. (repeater index varies).
  if (!/workexperience\d+/.test(compact)) return null;
  if (compact.includes('from') || compact.includes('startdate')) return 'workExperience[0].startDate';
  if (compact.includes('todate') || compact.includes('enddate')) return 'workExperience[0].endDate';
  if (compact.includes('location')) return 'workExperience[0].location';
  if (compact.includes('roledescription') || compact.includes('description')) return 'workExperience[0].description';
  if (compact.includes('icurrentlywork') || compact.includes('currentlywork')) return 'workExperience[0].currentlyEmployed';
  return null;
}

export function inferDataKeyFromLabel(labelText, fieldType) {
  const eduScoped = inferEducationScopedKey(labelText);
  if (eduScoped) return eduScoped;
  const scoped = inferWorkExperienceScopedKey(labelText);
  if (scoped) return scoped;

  const t = norm(labelText);

  if (fieldType === 'select' || fieldType === 'radio') {
    if (
      /\bphone\b/.test(t) &&
      /\bdevice\b/.test(t) &&
      /\btype\b/.test(t) &&
      !/\bphone\s+number\b/.test(t)
    ) {
      return 'unmapped';
    }
    // State/province before country — avoids mis-mapping when combined context includes "country" in name attrs
    if (
      /^state\*?$|^\s*state\s*\*?\s*$/i.test(t) ||
      /^state$|\bstate\/province|\bprovince\b/.test(t)
    ) {
      return 'commonAnswers.state';
    }
    if (/\byes\b|\bno\b|agree|acknowledge|accept|confirm|will you|do you|are you|have you|did you/.test(t)) {
      if (/authorized|authoris|legally.*work|permit.*work|eligible.*work|right.*work/.test(t)) {
        return 'commonAnswers.workAuthorization';
      }
      if (/sponsor|visa|h-1|h1b|immigration/.test(t)) return 'commonAnswers.sponsorship';
      if (/citizen|nationality|permanent resident|green card/.test(t)) return 'commonAnswers.citizenship';
      if (/veteran|disability|gender|race|ethnicity|eeo|diversity|lgbt/.test(t)) return 'commonAnswers.sensitiveOptional';
      if (/relocate|relocation|remote|hybrid|travel/.test(t)) return 'commonAnswers.relocation';
    }
    if (/country(?!.*phone)/.test(t) && !/united states|u\.s\.|usa/.test(t)) return 'commonAnswers.country';
    if (/\bcity\b/.test(t) && !/capacity|velocity/.test(t)) return 'commonAnswers.city';
    if (/\bzip\b|postal|post code/.test(t)) return 'commonAnswers.zip';
  }

  if (fieldType !== 'select' && fieldType !== 'radio') {
    if (t.includes('linkedin')) return 'linkedin';
    if (/\bemail\b|e-mail/.test(t)) return 'email';
    if (/\bmiddle\s*name\b|\bmiddle\s*initial\b/.test(t)) return 'middleName';
    if (/\bcity\b/.test(t) && !/capacity|velocity/.test(t)) return 'commonAnswers.city';
    if (/\b(zip|postal|post code)\b/.test(t)) return 'commonAnswers.zip';
    if (/^state\*?$|^\s*state\s*\*?\s*$/i.test(t) || /^state$/.test(t)) return 'commonAnswers.state';
    if (/\bcountry\b.*\bphone\b.*\bcode\b|\bphone\b.*\bcode\b|\bdial(?:ing)?\s*code\b/.test(t)) return 'unmapped';
    if (/\bphone\s*extension\b|\bextension\b|\bext\.?\b/.test(t)) return 'unmapped';
    if (/\bphone\b|mobile|\btel\b|cell/.test(t)) return 'phone';
    if (/\bfirst\s*name\b|given\s*name/.test(t)) return 'firstName';
    if (/\blast\s*name\b|surname|family\s*name/.test(t)) return 'lastName';
    if (/\bfull\s*name\b/.test(t) || (/\bname\b/.test(t) && !/company|user\s*name|username/.test(t))) return 'name';
  } else {
    if (/\bhow\s+did\s+you\s+hear|source|referral/.test(t)) return 'unmapped';
  }

  if (/salary|compensation|expected pay|desired pay|pay range/.test(t)) return 'commonAnswers.salary';
  if (/sponsor|visa|h-1|h1b/.test(t) && (fieldType === 'select' || fieldType === 'radio')) {
    return 'commonAnswers.sponsorship';
  }
  if (/authorized|authoris|legally.*work|eligible.*work|right.*work/.test(t)) {
    return 'commonAnswers.workAuthorization';
  }
  if (/citizen|nationality/.test(t)) return 'commonAnswers.citizenship';

  if (/school|university|college|institution/.test(t)) return 'education[0].school';
  if (/\bdegree\b|major|field of study/.test(t)) return 'education[0].degree';

  if (
    /job\s*title|position\s*title|current title|role\s*title|title\s*of\s*position|^\s*job\s*title\s*\*?\s*$/i.test(
      t,
    ) &&
    !/linkedin/.test(t)
  ) {
    return 'workExperience[0].title';
  }
  if (
    /employer|company name|organization|current company|^\s*company\s*\*?\s*$|^company\*?$/.test(t) &&
    !/phone|device/.test(t)
  ) {
    return 'workExperience[0].company';
  }
  if (/^\s*from\s*\*?\s*$/i.test(t)) return 'workExperience[0].startDate';
  if (/^\s*to\s*\*?\s*$/i.test(t)) return 'workExperience[0].endDate';
  if (
    /^\s*location\s*\*?\s*$/i.test(t) ||
    /^work\s*location$/i.test(t) ||
    /^job\s*location$/i.test(t)
  ) {
    return 'workExperience[0].location';
  }
  if (
    /\brole\s*description\b|describe\s*your\s*role|job\s*duties|responsibilities\s*(and|&)?\s*achievements?/i.test(
      t,
    )
  ) {
    return 'workExperience[0].description';
  }
  if (/start\s*date|end\s*date|dates\s*employed/.test(t)) return 'workExperience[0].dates';

  if (/cover\s*letter|personal statement/.test(t)) return 'coverLetter';
  if (/skill|technology|programming/.test(t)) return 'skills';

  if (fieldType === 'checkbox') {
    if (/\bi\s+currently\s+work|currently\s+work\s+here|present\s+employer/i.test(t)) {
      return 'workExperience[0].currentlyEmployed';
    }
    return 'unmapped';
  }

  return 'unmapped';
}

/**
 * True if label suggests a yes/no style question (for guarding text values on selects).
 * @param {string} labelText
 */
export function labelLooksLikeYesNo(labelText) {
  const t = norm(labelText);
  return (
    /\byes\b|\bno\b|are you|do you|will you|have you|did you|can you|agree|i acknowledge|i certify/.test(t) ||
    (/\b(authorized|authoris|sponsor|visa|h-1|h1b|citizen|eligible|legally)\b/.test(t) &&
      /\b(work|employment|u\.?s\.?|united states)\b/.test(t))
  );
}

/**
 * @param {string} labelText
 * @param {'input'|'select'|'textarea'|'checkbox'|'radio'} fieldType
 */
export function inferDataKeysToTry(labelText, fieldType) {
  const primary = inferDataKeyFromLabel(labelText, fieldType);
  /** @type {string[]} */
  const keys = [];
  const add = (k) => {
    if (k && k !== 'unmapped' && !keys.includes(k)) keys.push(k);
  };
  add(primary);

  const t = norm(labelText);
  if (/^\s*location\s*\*?\s*$/i.test(t) || /^work\s*location$/i.test(t)) {
    add('workExperience[0].location');
  }
  if (/^\s*from\s*\*?\s*$/i.test(t)) {
    add('workExperience[0].startDate');
    add('workExperience[0].dates');
  }
  if (/^\s*to\s*\*?\s*$/i.test(t)) {
    add('workExperience[0].endDate');
    add('workExperience[0].dates');
  }
  if (/\brole\s*description\b/i.test(t)) {
    add('workExperience[0].description');
  }
  if (fieldType === 'checkbox' && /\bi\s+currently\s+work|currently\s+work\s+here/i.test(t)) {
    add('workExperience[0].currentlyEmployed');
  }
  if (fieldType === 'select' || fieldType === 'radio') {
    if (/sponsor|visa|h-1|h1b/.test(t)) add('commonAnswers.sponsorship');
    if (/authorized|authoris|legally|eligible|right to work|work in/.test(t)) add('commonAnswers.workAuthorization');
    if (/citizen|nationality|permanent resident/.test(t)) add('commonAnswers.citizenship');
  }

  return keys;
}
