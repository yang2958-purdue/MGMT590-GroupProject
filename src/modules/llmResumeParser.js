import { SCRAPER_URL } from '../lib/constants.js';

/**
 * Call local Python server to parse resume via ChatGPT.
 * @param {string} rawText
 * @param {string} fileName
 * @returns {Promise<Object|null>}
 */
export async function parseResumeWithLLM(rawText, fileName) {
  const res = await fetch(`${SCRAPER_URL}/parse-resume-llm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    education: Array.isArray(llmData?.education) && llmData.education.length ? llmData.education : baseData.education,
    parserSource: 'llm-hybrid',
  };

  return merged;
}
