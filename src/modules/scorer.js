/**
 * Scoring module.
 *
 * Scores a job posting against a parsed resume.
 * Currently uses a keyword-overlap algorithm as a stub.
 */

/**
 * @typedef {import('./resumeParser.js').ResumeData} ResumeData
 * @typedef {import('./jobScraper.js').JobPosting} JobPosting
 */

/**
 * @typedef {Object} ScoreResult
 * @property {number} fitScore - 0 to 10, how well the resume fits the posting.
 * @property {number} atsScore - 0 to 100, keyword match percentage.
 * @property {string[]} matchedKeywords - Keywords found in both resume and posting.
 * @property {string[]} missingKeywords - Posting keywords missing from the resume.
 */

/**
 * Score a job posting against a resume.
 *
 * @param {ResumeData} resume - The parsed resume data.
 * @param {JobPosting} jobPosting - The job posting to score.
 * @returns {ScoreResult} Fit score (0-10), ATS score (0-100), and keyword lists.
 */
export function scoreJob(resume, jobPosting) {
  // SWAP: replace this function body with an LLM API call for more
  // intelligent scoring. The interface (inputs/outputs) stays the same.
  // Example: const result = await llmClient.score(resume, jobPosting);

  return keywordOverlapScore(resume, jobPosting);
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'all', 'also', 'am',
  'as', 'because', 'before', 'between', 'both', 'each', 'few', 'get',
  'got', 'here', 'how', 'i', 'into', 'it', 'its', 'like', 'make',
  'many', 'me', 'more', 'most', 'my', 'new', 'now', 'only', 'other',
  'our', 'out', 'over', 'own', 'same', 'she', 'he', 'some', 'such',
  'that', 'their', 'them', 'there', 'these', 'they', 'this', 'those',
  'through', 'under', 'up', 'us', 'use', 'we', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'you', 'your',
  'work', 'working', 'able', 'well', 'including', 'within', 'using',
  'experience', 'role', 'team', 'company', 'looking', 'join',
]);

/**
 * Extract meaningful keywords from text, filtering out stopwords.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractKeywords(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\-/\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));

  return new Set(words);
}

/**
 * Keyword-overlap scoring algorithm (stub for LLM replacement).
 * @param {ResumeData} resume
 * @param {JobPosting} posting
 * @returns {ScoreResult}
 */
function keywordOverlapScore(resume, posting) {
  const resumeKeywords = extractKeywords(resume.rawText);
  const postingKeywords = extractKeywords(posting.description);

  const matched = [];
  const missing = [];

  for (const kw of postingKeywords) {
    if (resumeKeywords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const total = postingKeywords.size || 1;
  const atsScore = Math.round((matched.length / total) * 100);
  const fitScore = Math.round((atsScore / 10) * 10) / 10;

  return {
    fitScore: Math.min(fitScore, 10),
    atsScore: Math.min(atsScore, 100),
    matchedKeywords: matched,
    missingKeywords: missing,
  };
}
