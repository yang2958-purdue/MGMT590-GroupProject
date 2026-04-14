/**
 * Overlap scoring for skill phrase lists (LLM-extracted or heuristic).
 */

/**
 * @param {string} s
 * @returns {string}
 */
export function normalizeSkillKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

/**
 * Compare posting skills against resume skills (posting-centric: matched = in both).
 *
 * @param {string[]} resumeSkills
 * @param {string[]} postingSkills
 * @returns {{ fitScore: number, atsScore: number, matchedKeywords: string[], missingKeywords: string[] }}
 */
export function skillsOverlapFromPosting(resumeSkills, postingSkills) {
  const resumeSet = new Set();
  for (const r of resumeSkills) {
    const k = normalizeSkillKey(r);
    if (k) resumeSet.add(k);
  }

  const matched = [];
  const missing = [];
  const seenPosting = new Set();

  for (const p of postingSkills) {
    const k = normalizeSkillKey(p);
    if (!k || seenPosting.has(k)) continue;
    seenPosting.add(k);
    if (resumeSet.has(k)) {
      matched.push(p);
    } else {
      missing.push(p);
    }
  }

  const total = seenPosting.size || 1;
  const atsScore = Math.round((matched.length / total) * 100);
  const fitScore = Math.round((atsScore / 10) * 10) / 10;

  return {
    fitScore: Math.min(fitScore, 10),
    atsScore: Math.min(atsScore, 100),
    matchedKeywords: matched,
    missingKeywords: missing,
  };
}
