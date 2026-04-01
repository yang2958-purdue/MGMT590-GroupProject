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
export function inferDataKeyFromLabel(labelText, fieldType) {
  const t = norm(labelText);

  if (fieldType === 'select' || fieldType === 'radio') {
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
    if (/^state$|\bstate\/province|\bprovince\b/.test(t)) return 'commonAnswers.state';
    if (/\bcity\b/.test(t) && !/capacity|velocity/.test(t)) return 'commonAnswers.city';
    if (/\bzip\b|postal|post code/.test(t)) return 'commonAnswers.zip';
  }

  if (fieldType !== 'select' && fieldType !== 'radio') {
    if (t.includes('linkedin')) return 'linkedin';
    if (/\bemail\b|e-mail/.test(t)) return 'email';
    if (/\bmiddle\s*name\b|\bmiddle\s*initial\b/.test(t)) return 'middleName';
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

  if (/job\s*title|position\s*title|current title/.test(t) && !/linkedin/.test(t)) return 'workExperience[0].title';
  if (/employer|company name|organization|current company/.test(t)) return 'workExperience[0].company';
  if (/start\s*date|end\s*date|dates\s*employed/.test(t)) return 'workExperience[0].dates';

  if (/cover\s*letter|personal statement/.test(t)) return 'coverLetter';
  if (/skill|technology|programming/.test(t)) return 'skills';

  if (fieldType === 'checkbox') return 'unmapped';

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
  if (fieldType === 'select' || fieldType === 'radio') {
    if (/sponsor|visa|h-1|h1b/.test(t)) add('commonAnswers.sponsorship');
    if (/authorized|authoris|legally|eligible|right to work|work in/.test(t)) add('commonAnswers.workAuthorization');
    if (/citizen|nationality|permanent resident/.test(t)) add('commonAnswers.citizenship');
  }

  return keys;
}
