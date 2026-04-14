import { SCRAPER_URL } from '../lib/constants.js';

/**
 * Extract skill phrases via local Python server (OpenAI).
 *
 * @param {string} text
 * @param {'resume' | 'job'} kind
 * @returns {Promise<string[]>}
 */
export async function extractSkillsLLM(text, kind) {
  const res = await fetch(`${SCRAPER_URL}/extract-skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text || '',
      kind,
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `extract-skills failed (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.skills) ? data.skills : [];
}
