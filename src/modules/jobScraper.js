import { SCRAPER_URL } from '../lib/constants.js';

/**
 * Job scraper module.
 *
 * Calls the local Python Flask server to scrape job postings.
 * The JS side knows nothing about which adapter (BeautifulSoup, Firecrawl, etc.)
 * is active on the server -- it simply POSTs criteria and receives results.
 */

/**
 * @typedef {Object} SearchCriteria
 * @property {string[]} titles - Job titles to search for.
 * @property {string[]} companies - Target company names.
 * @property {string} [location] - Location filter.
 * @property {number} [salary_range_min] - Minimum salary.
 * @property {number} [salary_range_max] - Maximum salary.
 * @property {string} [experience_level] - entry | mid | senior | lead
 * @property {boolean} [remote] - Remote-only filter.
 */

/**
 * @typedef {Object} JobPosting
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} description
 * @property {string} url
 * @property {string} date_posted
 * @property {string} [salary]
 */

/**
 * Scrape job postings matching the given criteria.
 * This is the single async interface consumed by the rest of the extension.
 *
 * @param {SearchCriteria} criteria - Search parameters.
 * @returns {Promise<JobPosting[]>} Array of job postings from the scraper server.
 * @throws {Error} If the server is unreachable or returns an error.
 */
export async function scrapeJobs(criteria) {
  const response = await fetch(`${SCRAPER_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Scraper server error (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Check if the scraper server is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const response = await fetch(`${SCRAPER_URL}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
