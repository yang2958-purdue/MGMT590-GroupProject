/**
 * Resume tailoring module.
 *
 * Provides advice on how to improve a resume for a specific job posting,
 * and can auto-generate a tailored version.
 * Currently uses keyword diffing as a stub.
 */

/**
 * @typedef {import('./resumeParser.js').ResumeData} ResumeData
 * @typedef {import('./jobScraper.js').JobPosting} JobPosting
 */

/**
 * @typedef {Object} TailoringAdvice
 * @property {string[]} missingKeywords - Skills/keywords in the posting but not in the resume.
 * @property {string} suggestions - Human-readable tailoring suggestions.
 */

/**
 * @typedef {Object} TailoredResume
 * @property {string} rawText - The tailored resume text.
 * @property {string[]} addedKeywords - Keywords that were incorporated.
 */

/**
 * Get tailoring advice for a resume against a job posting.
 *
 * @param {ResumeData} resume - The parsed resume data.
 * @param {JobPosting} jobPosting - The target job posting.
 * @returns {TailoringAdvice} Missing keywords and suggestions.
 */
export function getTailoringAdvice(resume, jobPosting) {
  // SWAP: replace this function body with an LLM API call for intelligent
  // tailoring advice. The interface (inputs/outputs) stays the same.
  // Example: const advice = await llmClient.getTailoringAdvice(resume, jobPosting);

  return keywordDiffAdvice(resume, jobPosting);
}

/**
 * Auto-tailor a resume for a specific job posting.
 *
 * @param {ResumeData} resume - The parsed resume data.
 * @param {JobPosting} jobPosting - The target job posting.
 * @returns {TailoredResume} The tailored resume text and keywords added.
 */
export function autoTailorResume(resume, jobPosting) {
  // SWAP: replace this function body with an LLM API call for AI-powered
  // resume rewriting. The interface (inputs/outputs) stays the same.
  // Example: const tailored = await llmClient.tailorResume(resume, jobPosting);

  return keywordInsertTailor(resume, jobPosting);
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
  'just', 'about', 'work', 'working', 'able', 'well',
]);

/**
 * Extract meaningful keywords from text.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractKeywords(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9#+.\-/\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
  );
}

/**
 * Keyword-diff tailoring advice (stub for LLM replacement).
 * @param {ResumeData} resume
 * @param {JobPosting} posting
 * @returns {TailoringAdvice}
 */
function keywordDiffAdvice(resume, posting) {
  const resumeKw = extractKeywords(resume.rawText);
  const postingKw = extractKeywords(posting.description);

  const missing = [...postingKw].filter((kw) => !resumeKw.has(kw));

  const top = missing.slice(0, 15);
  const suggestions = top.length
    ? `Consider adding these keywords to your resume: ${top.join(', ')}. ` +
      'Try incorporating them naturally into your experience bullet points ' +
      'or skills section.'
    : 'Your resume already covers the key terms in this posting.';

  return { missingKeywords: top, suggestions };
}

/**
 * Keyword-insert tailoring (stub for LLM replacement).
 * Appends a "Key Skills" addendum with missing keywords.
 * @param {ResumeData} resume
 * @param {JobPosting} posting
 * @returns {TailoredResume}
 */
function keywordInsertTailor(resume, posting) {
  const resumeKw = extractKeywords(resume.rawText);
  const postingKw = extractKeywords(posting.description);

  const missing = [...postingKw].filter((kw) => !resumeKw.has(kw));
  const top = missing.slice(0, 15);

  let tailored = resume.rawText;
  if (top.length) {
    tailored += `\n\nAdditional Key Skills: ${top.join(', ')}`;
  }

  return { rawText: tailored, addedKeywords: top };
}
