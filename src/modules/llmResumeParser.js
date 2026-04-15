import { buildJsonHeadersWithOptionalOpenAi } from '../lib/apiKeys.js';
import { SCRAPER_URL } from '../lib/constants.js';

/**
 * Call local Python server to parse resume via ChatGPT.
 * @param {string} rawText
 * @param {string} fileName
 * @returns {Promise<Object|null>}
 */
export async function parseResumeWithLLM(rawText, fileName) {
  const headers = await buildJsonHeadersWithOptionalOpenAi();
  const res = await fetch(`${SCRAPER_URL}/parse-resume-llm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      rawText,
      fileName,
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `LLM parser failed (${res.status})`);
  }

  return res.json();
}

/**
 * Merge deterministic and LLM parser output (LLM wins when non-empty).
 * @param {Object} baseData
 * @param {Object|null} llmData
 * @returns {Object}
 */
export function mergeResumeData(baseData, llmData) {
  if (!llmData) return { ...baseData, parserSource: 'heuristic' };

  const mergedEducation = mergeEducationEntries(baseData?.education, llmData?.education);

  const merged = {
    ...baseData,
    fileName: llmData.fileName || baseData.fileName,
    contact: {
      ...baseData.contact,
      name: llmData?.contact?.name || baseData?.contact?.name || '',
      email: llmData?.contact?.email || baseData?.contact?.email || '',
      phone: llmData?.contact?.phone || baseData?.contact?.phone || '',
    },
    location: {
      ...baseData.location,
      city: llmData?.location?.city || baseData?.location?.city || '',
      state: llmData?.location?.state || baseData?.location?.state || '',
      zip: llmData?.location?.zip || baseData?.location?.zip || '',
    },
    skills: Array.isArray(llmData?.skills) && llmData.skills.length ? llmData.skills : baseData.skills,
    experience:
      Array.isArray(llmData?.experience) && llmData.experience.length ? llmData.experience : baseData.experience,
    education: mergedEducation,
    parserSource: 'llm-hybrid',
  };

  return merged;
}

/**
 * Merge education entries from heuristic + LLM so we keep prior schools.
 * LLM entries are preferred first, but unique heuristic entries are preserved.
 * @param {Array<Object>|undefined} baseEdu
 * @param {Array<Object>|undefined} llmEdu
 * @returns {Array<Object>}
 */
function mergeEducationEntries(baseEdu, llmEdu) {
  const base = Array.isArray(baseEdu) ? baseEdu : [];
  const llm = Array.isArray(llmEdu) ? llmEdu : [];
  const ordered = [...llm, ...base];
  const out = [];
  const seen = new Set();

  for (const e of ordered) {
    if (!e || typeof e !== 'object') continue;
    const degree = String(e.degree || '').trim();
    const school = String(e.school || '').trim();
    const dates = String(e.dates || '').trim();
    if (!degree && !school && !dates) continue;

    // School-first dedupe key keeps distinct universities visible in debug.
    const key = `${school.toLowerCase()}|${degree.toLowerCase()}|${dates.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ degree, school, dates });
  }

  return out;
}
