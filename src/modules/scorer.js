/**
 * Scoring module.
 *
 * Scores a job posting against a parsed resume.
 * Uses OpenAI-backed skill extraction when the local server is available;
 * falls back to keyword-overlap heuristics otherwise.
 */

import { extractSkillsLLM } from './llmSkillExtractor.js';
import { skillsOverlapFromPosting } from './skillMatch.js';

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
 * @typedef {Object} ScoreJobOptions
 * @property {string[]} [resumeSkills] - Pre-extracted resume skills (one call per search).
 * @property {boolean} [resumeExtractFailed] - If true, skip LLM and use heuristic overlap.
 */

/**
 * Score a job posting against a resume.
 *
 * @param {ResumeData} resume - The parsed resume data.
 * @param {JobPosting} jobPosting - The job posting to score.
 * @param {ScoreJobOptions} [options] - Optional pre-extracted resume skills from the caller.
 * @returns {Promise<ScoreResult>} Fit score (0-10), ATS score (0-100), and keyword lists.
 */
export async function scoreJob(resume, jobPosting, options = {}) {
  if (options.resumeExtractFailed) {
    return keywordOverlapScore(resume, jobPosting);
  }

  try {
    let resumeSkills = options.resumeSkills;
    if (!Array.isArray(resumeSkills)) {
      resumeSkills = await extractSkillsLLM(resume.rawText, 'resume');
    }
    const postingSkills = await extractSkillsLLM(jobPosting.description || '', 'job');
    return skillsOverlapFromPosting(resumeSkills, postingSkills);
  } catch {
    return keywordOverlapScore(resume, jobPosting);
  }
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
