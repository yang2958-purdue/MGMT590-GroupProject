const api = globalThis.browser || globalThis.chrome;

/**
 * Storage key constants.
 * All chrome.storage.local keys used by the extension are defined here.
 */
export const KEYS = {
  RESUME: 'jobbot_resume',
  TARGETS: 'jobbot_targets',
  RESULTS: 'jobbot_results',
  SELECTED_JOB: 'jobbot_selectedJob',
  USER_PROFILE: 'jobbot_userProfile',
  SETTINGS: 'jobbot_settings',

  // BACKLOG: Application tracking table (company, title, date, link, resume used, status)
  // TRACKING: 'jobbot_tracking',

  // BACKLOG: Common Q&A store (pre-filled answers for recurring application questions)
  // QA_STORE: 'jobbot_qaStore',

  // BACKLOG: Application status pipeline (submitted -> screening -> interviewing -> rejected/offer)
  // STATUS_PIPELINE: 'jobbot_statusPipeline',
};

/**
 * Get a value from chrome.storage.local.
 * @param {string} key - The storage key.
 * @returns {Promise<*>} The stored value, or null if not found.
 */
export async function get(key) {
  const result = await api.storage.local.get(key);
  return result[key] ?? null;
}

/**
 * Set a value in chrome.storage.local.
 * @param {string} key - The storage key.
 * @param {*} value - The value to store (must be JSON-serializable).
 * @returns {Promise<void>}
 */
export async function set(key, value) {
  return api.storage.local.set({ [key]: value });
}

/**
 * Remove a key from chrome.storage.local.
 * @param {string} key - The storage key to remove.
 * @returns {Promise<void>}
 */
export async function remove(key) {
  return api.storage.local.remove(key);
}

/**
 * Clear all extension data from chrome.storage.local.
 * @returns {Promise<void>}
 */
export async function clear() {
  return api.storage.local.clear();
}

/**
 * Get all stored key-value pairs.
 * @returns {Promise<Object>}
 */
export async function getAll() {
  return api.storage.local.get(null);
}

// ─── Typed accessors ────────────────────────────────────────────

/**
 * @typedef {import('./resumeParser.js').ResumeData} ResumeData
 */

/**
 * Get the stored parsed resume.
 * @returns {Promise<ResumeData|null>}
 */
export async function getResume() {
  return get(KEYS.RESUME);
}

/**
 * Store parsed resume data.
 * @param {ResumeData} data
 * @returns {Promise<void>}
 */
export async function setResume(data) {
  return set(KEYS.RESUME, data);
}

/**
 * @typedef {Object} SearchTargets
 * @property {string[]} companies
 * @property {string[]} titles
 * @property {Object} filters
 * @property {number} [filters.salaryMin]
 * @property {number} [filters.salaryMax]
 * @property {string} [filters.location]
 * @property {string} [filters.experienceLevel]
 * @property {boolean} [filters.remote]
 */

/**
 * Get the stored search targets (companies, titles, filters).
 * @returns {Promise<SearchTargets|null>}
 */
export async function getTargets() {
  return get(KEYS.TARGETS);
}

/**
 * Store search targets.
 * @param {SearchTargets} data
 * @returns {Promise<void>}
 */
export async function setTargets(data) {
  return set(KEYS.TARGETS, data);
}

/**
 * @typedef {Object} JobPosting
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} description
 * @property {string} url
 * @property {string} date_posted
 * @property {string} [salary]
 * @property {number} fitScore  - 0 to 10
 * @property {number} atsScore  - 0 to 100
 * @property {string[]} [matchedKeywords]
 * @property {string[]} [missingKeywords]
 */

/**
 * Get the stored scored job results.
 * @returns {Promise<JobPosting[]|null>}
 */
export async function getResults() {
  return get(KEYS.RESULTS);
}

/**
 * Store scored job results.
 * @param {JobPosting[]} data
 * @returns {Promise<void>}
 */
export async function setResults(data) {
  return set(KEYS.RESULTS, data);
}

/**
 * Get the currently selected job posting for the detail view.
 * @returns {Promise<JobPosting|null>}
 */
export async function getSelectedJob() {
  return get(KEYS.SELECTED_JOB);
}

/**
 * Store the selected job posting for the detail view.
 * @param {JobPosting} data
 * @returns {Promise<void>}
 */
export async function setSelectedJob(data) {
  return set(KEYS.SELECTED_JOB, data);
}

/**
 * @typedef {Object} UserProfile
 * @property {string} [citizenship]
 * @property {string} [sponsorship]
 * @property {string} [desiredSalary]
 * @property {Object.<string, string>} [customAnswers]
 */

/**
 * Get the stored user profile (autofill Q&A data).
 * @returns {Promise<UserProfile|null>}
 */
export async function getUserProfile() {
  return get(KEYS.USER_PROFILE);
}

/**
 * Store user profile data.
 * @param {UserProfile} data
 * @returns {Promise<void>}
 */
export async function setUserProfile(data) {
  return set(KEYS.USER_PROFILE, data);
}

/**
 * Get extension settings.
 * @returns {Promise<Object|null>}
 */
export async function getSettings() {
  return get(KEYS.SETTINGS);
}

/**
 * Store extension settings.
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function setSettings(data) {
  return set(KEYS.SETTINGS, data);
}
