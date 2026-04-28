import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * @typedef {Object} ContactInfo
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 */

/**
 * @typedef {Object} ExperienceEntry
 * @property {string} title
 * @property {string} company
 * @property {string} dates
 * @property {string} [location] - Job site / employment location when parsed (not mailing address).
 * @property {string[]} bullets
 */

/**
 * @typedef {Object} EducationEntry
 * @property {string} degree
 * @property {string} school
 * @property {string} dates
 */

/**
 * @typedef {Object} ResumeData
 * @property {string} fileName
 * @property {string} rawText
 * @property {ContactInfo} contact
 * @property {{ city: string, state: string, zip: string }} location
 * @property {string[]} skills
 * @property {ExperienceEntry[]} experience
 * @property {EducationEntry[]} education
 * @property {string} [parserSource] - heuristic | llm-hybrid
 * @property {string} [parsedAt] - ISO timestamp when this resume was last parsed.
 */

/**
 * Parse a resume file (PDF or DOCX) into a structured JS object.
 * @param {File} file - The uploaded resume file.
 * @returns {Promise<ResumeData>} Parsed resume data.
 * @throws {Error} If the file type is unsupported or parsing fails.
 */
export async function parseResume(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let rawText;

  if (ext === 'pdf') {
    rawText = await extractTextFromPDF(file);
  } else if (ext === 'docx') {
    rawText = await extractTextFromDOCX(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please use PDF or DOCX.`);
  }

  rawText = rawText.trim();
  if (!rawText) {
    throw new Error('No text could be extracted from the file.');
  }

  return {
    fileName: file.name,
    rawText,
    contact: extractContact(rawText),
    location: extractLocation(rawText),
    skills: extractSkills(rawText),
    experience: extractExperience(rawText),
    education: extractEducation(rawText),
  };
}

/**
 * Extract text from a PDF file using pdf.js.
 * Concatenates text items from all pages, inserting newlines on y-coordinate changes.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY = null;
    let line = '';

    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);

      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pages.push(line);
        line = '';
      } else if (line.length > 0 && !line.endsWith(' ')) {
        line += ' ';
      }

      line += item.str;
      lastY = y;
    }

    if (line) pages.push(line);
  }

  return pages.join('\n');
}

/**
 * Extract text from a DOCX file using mammoth.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractTextFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

const SECTION_HEADERS = /^(?:skills|technical\s+skills|core\s+competencies|technologies|proficiencies|tools|expertise|experience|work\s+experience|professional\s+experience|employment|employment\s+history|education|academic|certifications?|projects|summary|objective|profile)\b/i;

/**
 * Split resume text into named sections based on common header patterns.
 * Returns a Map where keys are lowercase section names and values are section text.
 * @param {string} text
 * @returns {Map<string, string>}
 */
function splitSections(text) {
  const lines = text.split('\n');
  const sections = new Map();
  let currentSection = '_header';
  let currentLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentLines.push('');
      continue;
    }

    if (SECTION_HEADERS.test(trimmed) && trimmed.length < 60) {
      sections.set(currentSection, currentLines.join('\n').trim());
      currentSection = trimmed.replace(/[:\-–—|]+$/, '').trim().toLowerCase();
      currentLines = [];
    } else {
      currentLines.push(trimmed);
    }
  }

  sections.set(currentSection, currentLines.join('\n').trim());
  return sections;
}

/**
 * Find a section by matching any of the given key prefixes.
 * @param {Map<string, string>} sections
 * @param {string[]} prefixes
 * @returns {string}
 */
function findSection(sections, prefixes) {
  for (const [key, value] of sections) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) return value;
    }
  }
  return '';
}

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;

/**
 * Extract contact information from resume text.
 * @param {string} text
 * @returns {ContactInfo}
 */
function extractContact(text) {
  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);

  let name = '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (SECTION_HEADERS.test(line)) break;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/^https?:\/\//.test(line)) continue;
    if (line.length > 80) continue;
    if (line.split(/\s+/).length <= 5) {
      name = line;
      break;
    }
  }

  return {
    name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[1].trim() : '',
  };
}

/** US full state / territory name (lowercase) → USPS abbreviation */
const US_STATE_FULL_TO_ABBR = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'puerto rico': 'PR',
  guam: 'GU',
  'american samoa': 'AS',
  'virgin islands': 'VI',
  'northern mariana islands': 'MP',
};

/**
 * @param {string} name
 * @returns {string}
 */
function fullStateNameToAbbr(name) {
  const k = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return US_STATE_FULL_TO_ABBR[k] || '';
}

/**
 * Try to parse one line (or segment) as City, ST / City, State / + ZIP.
 * @param {string} line
 * @returns {{ city: string, state: string, zip: string } | null}
 */
function parseLocationLine(line) {
  const s = (line || '').trim();
  if (!s || EMAIL_RE.test(s) || /^https?:\/\//i.test(s)) return null;

  const cityStateZip = /^([A-Za-z][A-Za-z\s.'-]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;
  const cityStateZipNoComma = /^([A-Za-z][A-Za-z\s.'-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;
  const cityState = /^([A-Za-z][A-Za-z\s.'-]+?),\s*([A-Z]{2})\b\s*$/;
  const cityFullStateZip =
    /^([A-Za-z][A-Za-z\s.'-]+),\s*([A-Za-z][A-Za-z\s]{2,})\s+(\d{5}(?:-\d{4})?)\s*$/;
  const cityFullState = /^([A-Za-z][A-Za-z\s.'-]+),\s*([A-Za-z][A-Za-z\s]{2,})\s*$/;

  let m = s.match(cityStateZip);
  if (m) {
    return { city: m[1].trim(), state: m[2].trim(), zip: m[3].trim() };
  }

  m = s.match(cityStateZipNoComma);
  if (m) {
    return { city: m[1].trim(), state: m[2].trim(), zip: m[3].trim() };
  }

  m = s.match(cityFullStateZip);
  if (m) {
    const abbr = fullStateNameToAbbr(m[2]);
    if (abbr) return { city: m[1].trim(), state: abbr, zip: m[3].trim() };
  }

  m = s.match(cityFullState);
  if (m) {
    const abbr = fullStateNameToAbbr(m[2]);
    if (abbr) return { city: m[1].trim(), state: abbr, zip: '' };
  }

  m = s.match(cityState);
  if (m) {
    return { city: m[1].trim(), state: m[2].trim(), zip: '' };
  }

  return null;
}

/**
 * Extract city/state/zip from the header and contact area of the resume.
 * Handles "Austin, TX 78701", "Austin TX 78701", "Chicago, Illinois 60601", pipe-separated contact lines, and Address:/Location: prefixes.
 * @param {string} text
 * @returns {{ city: string, state: string, zip: string }}
 */
function extractLocation(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 100);
  const location = { city: '', state: '', zip: '' };

  for (let line of lines) {
    if (SECTION_HEADERS.test(line) && line.length < 60) break;

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) continue;
    if (PHONE_RE.test(line) && !/[|,]/.test(line)) continue;

    line = line.replace(/^(address|location|residing in|based in|current\s+address)\s*[:\-–—]\s*/i, '').trim();
    if (!line) continue;

    const segments = line.includes('|') ? line.split('|').map((x) => x.trim()).filter(Boolean) : [line];

    for (const seg of segments) {
      if (EMAIL_RE.test(seg) || /^https?:\/\//i.test(seg)) continue;
      if (PHONE_RE.test(seg) && !/[|,]/.test(seg)) continue;

      const parsed = parseLocationLine(seg);
      if (parsed && parsed.city && parsed.state) {
        location.city = parsed.city;
        location.state = parsed.state;
        location.zip = parsed.zip || '';
        return location;
      }
    }
  }

  return location;
}

const SKILLS_PREFIXES = ['skills', 'technical skills', 'core competencies', 'technologies', 'proficiencies', 'tools', 'expertise'];
const SPLIT_RE = /[,|•·▪■►●;]/;

const EXP_PREFIXES = ['experience', 'work experience', 'professional experience', 'employment'];
const PROJECT_PREFIXES = [
  'projects',
  'selected projects',
  'personal projects',
  'key projects',
  'academic projects',
  'side projects',
];

/**
 * @param {string[]} items
 * @returns {string[]}
 */
function dedupeSkillsCaseInsensitive(items) {
  const seen = new Set();
  const out = [];
  for (const s of items) {
    const t = String(s).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Pull skill-like tokens from experience and project bullets (parentheticals, "Tech:", comma lists).
 * @param {string} blocks
 * @returns {string[]}
 */
function extractSkillsFromTechnicalText(blocks) {
  const skills = [];
  const lines = blocks.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const labelMatch = trimmed.match(
      /\b(?:technologies|tech stack|tools|stack|built with|using|environment)\s*[:\-–]\s*(.+)$/i,
    );
    if (labelMatch) {
      skills.push(...parseSkillsList(labelMatch[1]));
    }

    for (const m of trimmed.matchAll(/\(([^)]+)\)/g)) {
      const inner = m[1];
      if (inner.length > 140) continue;
      if (SPLIT_RE.test(inner) || inner.includes(',')) {
        skills.push(...parseSkillsList(inner));
      }
    }

    if (/^[\-–—*•]/.test(trimmed)) {
      const afterBullet = trimmed.replace(/^[\-–—*•\s]+/, '');
      const chunk = afterBullet.includes(':')
        ? afterBullet
            .split(':')
            .slice(1)
            .join(':')
            .trim()
        : afterBullet;
      const parts = chunk.split(SPLIT_RE).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        for (const part of parts) {
          const c = part.replace(/^[\s\-–—*]+/, '').replace(/[\s\-–—*.]+$/, '');
          if (isLikelySkill(c)) skills.push(c);
        }
      }
    }
  }

  return dedupeSkillsCaseInsensitive(skills);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractSkillsFromExperienceAndProjects(text) {
  const sections = splitSections(text);
  const exp = findSection(sections, EXP_PREFIXES);
  const proj = findSection(sections, PROJECT_PREFIXES);
  const blocks = [exp, proj].filter(Boolean).join('\n\n');
  if (!blocks.trim()) return [];
  return extractSkillsFromTechnicalText(blocks);
}

/**
 * Extract skills from the resume text.
 * Uses a dedicated Skills section when present; also mines experience/project bullets for tools and technologies.
 * Falls back to scanning for short comma-separated phrases if no skills section is found.
 * @param {string} text
 * @returns {string[]}
 */
function extractSkills(text) {
  const sections = splitSections(text);
  const skillsText = findSection(sections, SKILLS_PREFIXES);

  const fromSection = skillsText ? parseSkillsList(skillsText) : fallbackSkillsScan(text);
  const fromExpProj = extractSkillsFromExperienceAndProjects(text);

  return dedupeSkillsCaseInsensitive([...fromSection, ...fromExpProj]);
}

/**
 * Parse a block of skills text into individual skill strings.
 * @param {string} text
 * @returns {string[]}
 */
function parseSkillsList(text) {
  const skills = [];
  const lines = text.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    if (SECTION_HEADERS.test(line.trim()) && !SKILLS_PREFIXES.some((p) => line.trim().toLowerCase().startsWith(p))) {
      break;
    }

    const labelStripped = line.replace(/^[^:]+:\s*/, '');
    const parts = labelStripped.split(SPLIT_RE);

    for (const part of parts) {
      const cleaned = part
        .replace(/^[\s\-–—*]+/, '')
        .replace(/[\s\-–—*]+$/, '')
        .trim();
      if (isLikelySkill(cleaned)) {
        skills.push(cleaned);
      }
    }
  }

  return [...new Set(skills)];
}

/**
 * Fallback: scan all lines for comma-separated short phrases
 * that look like skill lists (3+ items, each under 40 chars).
 * @param {string} text
 * @returns {string[]}
 */
function fallbackSkillsScan(text) {
  const skills = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const parts = line.split(SPLIT_RE).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3 && parts.every((p) => p.length < 40 && isLikelySkill(p))) {
      skills.push(...parts.filter(isLikelySkill));
    }
  }

  return [...new Set(skills)];
}

/**
 * Filter out obvious non-skill tokens (emails, phones, links, addresses).
 * @param {string} token
 * @returns {boolean}
 */
function isLikelySkill(token) {
  const t = (token || '').trim();
  if (!t || t.length < 2 || t.length > 60) return false;
  if (/@/.test(t)) return false;
  if (/https?:\/\//i.test(t)) return false;
  if (/\b(linkedin|phone|email|address|austin|texas|tx)\b/i.test(t)) return false;
  if (/^\d[\d\s\-().]+$/.test(t)) return false;
  return true;
}

const DATE_RE = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:[-–—]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|Present|Current))?|\d{1,2}\/\d{4}\s*[-–—]\s*(?:\d{1,2}\/\d{4}|Present|Current)|\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current)/i;

/**
 * @param {string} s
 * @returns {boolean}
 */
function looksLikeJobLocationLine(s) {
  const t = (s || '').trim();
  if (!t || t.length < 2 || t.length > 80) return false;
  if (DATE_RE.test(t)) return false;
  if (/^\d[\d\s\-().]+$/.test(t)) return false;
  if (/^(remote|hybrid|on-?site)\s*$/i.test(t)) return true;
  return /^[A-Za-z][A-Za-z\s.'-]+?,\s*([A-Z]{2}|[A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?)\s*$/.test(t);
}

/**
 * @param {string} line
 * @returns {string}
 */
function extractJobLocationFromPipe(line) {
  const parts = String(line || '').split(/\s*\|\s*/);
  if (parts.length < 2) return '';
  const right = parts.slice(1).join('|').trim();
  return looksLikeJobLocationLine(right) ? right : '';
}

/**
 * Extract work experience entries from the resume text.
 * Detects entries by date patterns and collects bullet points.
 * @param {string} text
 * @returns {ExperienceEntry[]}
 */
function extractExperience(text) {
  const sections = splitSections(text);
  const expText = findSection(sections, EXP_PREFIXES);
  if (!expText) return [];

  const lines = expText.split('\n');
  const entries = [];
  let current = null;
  const recentHeaderLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (SECTION_HEADERS.test(trimmed) && !EXP_PREFIXES.some((p) => trimmed.toLowerCase().startsWith(p))) {
      break;
    }

    const dateMatch = trimmed.match(DATE_RE);
    const isBullet = /^[\-–—*•►●▪■]/.test(trimmed);

    if (dateMatch) {
      if (current) entries.push(current);

      const dateStr = dateMatch[0].trim();
      const headerOnDateLine = trimmed.replace(dateMatch[0], '').trim().replace(/^[|,\-–—\s]+|[|,\-–—\s]+$/g, '');
      let title = '';
      let company = '';

      if (headerOnDateLine) {
        const parsed = parseTitleCompany(headerOnDateLine, '');
        title = parsed.title;
        company = parsed.company;
      } else {
        const prevLine = recentHeaderLines[recentHeaderLines.length - 1] || '';
        const prevPrevLine = recentHeaderLines[recentHeaderLines.length - 2] || '';
        const parsed = parseExperienceHeaderFromContext(prevPrevLine, prevLine);
        title = parsed.title;
        company = parsed.company;
      }

      current = {
        title,
        company,
        dates: dateStr,
        bullets: [],
        location: '',
      };
      recentHeaderLines.length = 0;
      continue;
    }

    if (isBullet && current) {
      const bullet = trimmed.replace(/^[\-–—*•►●▪■]+\s*/, '');
      if (bullet) current.bullets.push(bullet);
      continue;
    }

    if (current) {
      if (!current.location && looksLikeJobLocationLine(trimmed)) {
        current.location = trimmed;
        continue;
      }
      // Many resumes place company/title on lines adjacent to dates.
      if (!current.company && looksLikeCompanyLine(trimmed)) {
        const locPipe = extractJobLocationFromPipe(trimmed);
        if (locPipe) current.location = locPipe;
        current.company = extractCompanyFromLine(trimmed);
        continue;
      }
      if (!current.title && !looksLikeCompanyLine(trimmed)) {
        current.title = trimmed;
        continue;
      }
      if (looksLikePotentialExperienceHeader(trimmed)) {
        recentHeaderLines.push(trimmed);
        if (recentHeaderLines.length > 4) recentHeaderLines.shift();
        continue;
      }
      const bullet = trimmed.replace(/^[\-–—*•►●▪■]+\s*/, '');
      if (bullet) current.bullets.push(bullet);
    } else {
      if (!isBullet) {
        recentHeaderLines.push(trimmed);
        if (recentHeaderLines.length > 4) recentHeaderLines.shift();
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * Parse title/company from lines around a date line.
 * @param {string} titleLike
 * @param {string} companyLike
 * @returns {{ title: string, company: string }}
 */
function parseExperienceHeaderFromContext(titleLike, companyLike) {
  const title = (titleLike || '').trim();
  const company = extractCompanyFromLine(companyLike || '');

  if (title && company) return { title, company };

  const fallback = parseTitleCompany(companyLike || titleLike || '', '');
  return {
    title: title || fallback.title || '',
    company: company || fallback.company || '',
  };
}

/**
 * Heuristic to identify company lines under experience sections.
 * @param {string} line
 */
function looksLikeCompanyLine(line) {
  const t = (line || '').trim();
  if (!t) return false;
  if (/\b(inc|llc|corp|company|co\.|technologies|technology|solutions|group|labs|systems|university|bank|hospital)\b/i.test(t)) {
    return true;
  }
  if (/\s\|\s/.test(t)) return true; // "Company | City, ST"
  if (/^at\s+/i.test(t)) return true;
  return false;
}

/**
 * Heuristic for short, header-like lines likely to precede the next date entry.
 * @param {string} line
 */
function looksLikePotentialExperienceHeader(line) {
  const t = (line || '').trim();
  if (!t) return false;
  if (DATE_RE.test(t)) return false;
  if (t.length > 90) return false;
  if (/[.!?]$/.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;
  return true;
}

/**
 * Remove likely location/date fragments and keep company text.
 * @param {string} line
 */
function extractCompanyFromLine(line) {
  let s = (line || '').replace(DATE_RE, '').trim();
  s = s.replace(/^at\s+/i, '').trim();
  if (!s) return '';

  if (s.includes(' | ')) {
    s = s.split(' | ')[0].trim();
  }

  s = s.replace(/,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/, '').trim();
  s = s.replace(/\s[-–—]\s[A-Z][a-z]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/, '').trim();

  return s;
}

/**
 * Attempt to parse a title and company from an experience header line.
 * @param {string} line
 * @param {string} dateStr
 * @returns {{ title: string, company: string }}
 */
function parseTitleCompany(line, dateStr) {
  const withoutDate = line.replace(dateStr, '').trim().replace(/[,|]+$/, '').trim();

  const atSplit = withoutDate.split(/\bat\b|\s[-–—|]\s/i);
  if (atSplit.length >= 2) {
    return {
      title: atSplit[0].trim(),
      company: atSplit.slice(1).join(' ').trim(),
    };
  }

  const commaSplit = withoutDate.split(',');
  if (commaSplit.length >= 2) {
    return {
      title: commaSplit[0].trim(),
      company: commaSplit.slice(1).join(',').trim(),
    };
  }

  return { title: withoutDate, company: '' };
}

const EDU_PREFIXES = ['education', 'academic'];
const DEGREE_RE = /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?|Bachelor|Master|Doctor|Associate|Diploma)\b/i;
const SCHOOL_KEYWORDS_RE = /\b(university|college|institute|school|polytechnic|academy|conservatory)\b/i;
const KNOWN_UNIVERSITIES = [
  'Purdue University',
  'Massachusetts Institute of Technology',
  'Stanford University',
  'Harvard University',
  'University of California',
  'University of Michigan',
  'University of Texas',
  'Texas A&M University',
  'Carnegie Mellon University',
  'Georgia Institute of Technology',
  'University of Illinois',
  'Cornell University',
  'Columbia University',
  'Princeton University',
  'Yale University',
  'University of Washington',
  'University of Wisconsin',
  'University of Florida',
  'New York University',
  'University of Southern California',
  'Ohio State University',
  'Pennsylvania State University',
  'University of Pennsylvania',
  'Johns Hopkins University',
  'University of Maryland',
  'Arizona State University',
  'Michigan State University',
  'Northwestern University',
  'Duke University',
  'Brown University',
  'University of Chicago',
];

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeSchoolText(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try to detect a known university string in arbitrary text.
 * @param {string} text
 * @returns {string}
 */
function findKnownUniversityInText(text) {
  const norm = normalizeSchoolText(text);
  if (!norm) return '';
  for (const school of KNOWN_UNIVERSITIES) {
    const s = normalizeSchoolText(school);
    if (s && norm.includes(s)) return school;
  }
  return '';
}

/**
 * Heuristic: determine if text likely names a school.
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeSchoolName(text) {
  const t = (text || '').trim();
  if (!t || t.length < 3 || t.length > 100) return false;
  if (DEGREE_RE.test(t)) return false;
  if (DATE_RE.test(t)) return false;
  if (SCHOOL_KEYWORDS_RE.test(t)) return true;
  if (findKnownUniversityInText(t)) return true;
  // Common short-form names without "University".
  if (/^(mit|caltech|harvard|stanford|oxford|cambridge)$/i.test(t)) return true;
  return false;
}

/**
 * Extract education entries from the resume text.
 * @param {string} text
 * @returns {EducationEntry[]}
 */
function extractEducation(text) {
  const sections = splitSections(text);
  const eduText = findSection(sections, EDU_PREFIXES);
  if (!eduText) return [];

  const lines = eduText.split('\n').filter((l) => l.trim());
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (SECTION_HEADERS.test(trimmed) && !EDU_PREFIXES.some((p) => trimmed.toLowerCase().startsWith(p))) {
      break;
    }

    const hasDegree = DEGREE_RE.test(trimmed);
    const hasDate = DATE_RE.test(trimmed);

    if (hasDegree || (hasDate && !current)) {
      if (current) entries.push(current);

      const dateMatch = trimmed.match(DATE_RE);
      const withoutDate = dateMatch
        ? trimmed.replace(dateMatch[0], '').trim()
        : trimmed;

      const { degree, school } = parseDegreeSchool(withoutDate);
      current = {
        degree,
        school,
        dates: dateMatch ? dateMatch[0].trim() : '',
      };
    } else if (current) {
      if (!current.dates) {
        const dateMatch = trimmed.match(DATE_RE);
        if (dateMatch) {
          current.dates = dateMatch[0].trim();
          continue;
        }
      }
      if (!current.school && trimmed.length < 80 && looksLikeSchoolName(trimmed)) {
        current.school = trimmed;
        continue;
      }
      // If we captured a weak/non-school string, upgrade when a real school line appears.
      if (trimmed.length < 80 && looksLikeSchoolName(trimmed) && !looksLikeSchoolName(current.school)) {
        current.school = trimmed;
      }
    }
  }

  if (current) entries.push(current);
  return collapseMinorOnlyEducationEntries(entries);
}

/**
 * Collapse minor-only education rows into primary degree rows for same school.
 * Avoids treating "Minor in X" as a separate education block.
 * @param {EducationEntry[]} entries
 * @returns {EducationEntry[]}
 */
function collapseMinorOnlyEducationEntries(entries) {
  const out = [];
  const isMinorOnly = (degree) => {
    const d = String(degree || '').trim();
    if (!d) return false;
    const low = d.toLowerCase();
    const hasMinor = /\bminor\b/.test(low);
    const hasPrimary = /\b(bachelor|master|ph\.?d|doctor|associate|mba|b\.?s|b\.?a|m\.?s|m\.?a)\b/.test(low);
    return hasMinor && !hasPrimary;
  };

  for (const e of entries) {
    const degree = String(e?.degree || '').trim();
    const school = String(e?.school || '').trim();
    const dates = String(e?.dates || '').trim();

    if (!isMinorOnly(degree)) {
      out.push({ degree, school, dates });
      continue;
    }

    const target = out.find(
      (x) =>
        String(x.school || '').trim().toLowerCase() === school.toLowerCase() &&
        !isMinorOnly(String(x.degree || '').trim()),
    );
    if (target) {
      const minorText = degree.replace(/^\s*minor\s*(in)?\s*/i, '').trim();
      const addition = minorText ? `Minor: ${minorText}` : degree;
      if (!target.degree.toLowerCase().includes(addition.toLowerCase())) {
        target.degree = target.degree ? `${target.degree}; ${addition}` : addition;
      }
      if (!target.dates && dates) target.dates = dates;
    }
    // Otherwise drop minor-only row to avoid extra education blocks.
  }

  return out;
}

/**
 * Parse degree and school from an education line.
 * @param {string} line
 * @returns {{ degree: string, school: string }}
 */
function parseDegreeSchool(line) {
  const cleaned = line.replace(/[,|]+$/, '').trim();
  const knownSchoolInLine = findKnownUniversityInText(cleaned);
  if (knownSchoolInLine) {
    const degreeCandidate = cleaned
      .replace(new RegExp(knownSchoolInLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
      .replace(/^[,\s\-–—|]+|[,\s\-–—|]+$/g, '')
      .trim();
    return { degree: degreeCandidate, school: knownSchoolInLine };
  }

  const commaSplit = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
  if (commaSplit.length >= 2) {
    const schoolIdx = commaSplit.findIndex((s) => looksLikeSchoolName(s));
    const degreeIdx = commaSplit.findIndex((s) => DEGREE_RE.test(s));
    if (schoolIdx >= 0 && degreeIdx >= 0 && schoolIdx !== degreeIdx) {
      return {
        degree: commaSplit[degreeIdx],
        school: commaSplit[schoolIdx],
      };
    }
    if (schoolIdx >= 0) {
      const degree = commaSplit.filter((_, i) => i !== schoolIdx).join(', ');
      return { degree, school: commaSplit[schoolIdx] };
    }
    if (degreeIdx >= 0) {
      const degree = commaSplit[degreeIdx];
      const school = commaSplit.filter((_, i) => i !== degreeIdx).join(', ');
      return { degree, school };
    }
    return { degree: commaSplit[0], school: commaSplit.slice(1).join(', ') };
  }

  const dashSplit = cleaned.split(/\s[-–—|]\s/);
  if (dashSplit.length >= 2) {
    const left = dashSplit[0].trim();
    const right = dashSplit.slice(1).join(' ').trim();
    if (looksLikeSchoolName(left) && !looksLikeSchoolName(right)) {
      return { degree: right, school: left };
    }
    if (looksLikeSchoolName(right)) {
      return { degree: left, school: right };
    }
    return { degree: left, school: right };
  }

  if (looksLikeSchoolName(cleaned)) {
    return { degree: '', school: cleaned };
  }
  return { degree: cleaned, school: '' };
}
