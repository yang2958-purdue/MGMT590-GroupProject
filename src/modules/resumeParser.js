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

/**
 * Extract city/state/zip from top resume lines.
 * Handles patterns like "Austin, TX 78701" and "Austin TX 78701".
 * @param {string} text
 * @returns {{ city: string, state: string, zip: string }}
 */
function extractLocation(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 30);
  const location = { city: '', state: '', zip: '' };

  const cityStateZip = /([A-Za-z][A-Za-z\s.'-]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/;
  const cityState = /([A-Za-z][A-Za-z\s.'-]+?),\s*([A-Z]{2})\b/;
  const cityStateZipNoComma = /([A-Za-z][A-Za-z\s.'-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/;

  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || /^https?:\/\//i.test(line)) continue;

    let m = line.match(cityStateZip);
    if (m) {
      location.city = m[1].trim();
      location.state = m[2].trim();
      location.zip = m[3].trim();
      return location;
    }

    m = line.match(cityStateZipNoComma);
    if (m) {
      location.city = m[1].trim();
      location.state = m[2].trim();
      location.zip = m[3].trim();
      return location;
    }

    m = line.match(cityState);
    if (m) {
      location.city = m[1].trim();
      location.state = m[2].trim();
      return location;
    }
  }

  return location;
}

const SKILLS_PREFIXES = ['skills', 'technical skills', 'core competencies', 'technologies', 'proficiencies', 'tools', 'expertise'];
const SPLIT_RE = /[,|•·▪■►●;]/;

/**
 * Extract skills from the resume text.
 * Finds the skills section and splits on common delimiters.
 * Falls back to scanning for short comma-separated phrases if no section is found.
 * @param {string} text
 * @returns {string[]}
 */
function extractSkills(text) {
  const sections = splitSections(text);
  const skillsText = findSection(sections, SKILLS_PREFIXES);

  if (skillsText) {
    return parseSkillsList(skillsText);
  }

  return fallbackSkillsScan(text);
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

const EXP_PREFIXES = ['experience', 'work experience', 'professional experience', 'employment'];
const DATE_RE = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:[-–—]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|Present|Current))?|\d{1,2}\/\d{4}\s*[-–—]\s*(?:\d{1,2}\/\d{4}|Present|Current)|\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current)/i;

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
      // Many resumes place company/title on lines adjacent to dates.
      if (!current.company && looksLikeCompanyLine(trimmed)) {
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
      if (!current.school && trimmed.length < 80) {
        current.school = trimmed;
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * Parse degree and school from an education line.
 * @param {string} line
 * @returns {{ degree: string, school: string }}
 */
function parseDegreeSchool(line) {
  const cleaned = line.replace(/[,|]+$/, '').trim();

  const commaSplit = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
  if (commaSplit.length >= 2) {
    const degreeIdx = commaSplit.findIndex((s) => DEGREE_RE.test(s));
    if (degreeIdx >= 0) {
      const degree = commaSplit[degreeIdx];
      const school = commaSplit.filter((_, i) => i !== degreeIdx).join(', ');
      return { degree, school };
    }
    return { degree: commaSplit[0], school: commaSplit.slice(1).join(', ') };
  }

  const dashSplit = cleaned.split(/\s[-–—|]\s/);
  if (dashSplit.length >= 2) {
    return { degree: dashSplit[0].trim(), school: dashSplit.slice(1).join(' ').trim() };
  }

  return { degree: cleaned, school: '' };
}
