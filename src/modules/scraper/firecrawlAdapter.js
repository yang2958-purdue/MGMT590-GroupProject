// CONFIG: optional build-time key in config/firecrawl.config.js; runtime prefers chrome.storage (see apiKeys.js)
import { FIRECRAWL_BASE_URL, USE_MOCK } from '../../config/firecrawl.config.js';
import { getResolvedFirecrawlApiKey } from '../../lib/apiKeys.js';

/**
 * @typedef {Object} ScrapeResult
 * @property {string} markdown  - Page content as markdown.
 * @property {string} rawHtml   - Raw HTML of the page.
 * @property {Object} metadata  - Page metadata (title, description, etc.).
 */

/**
 * @typedef {Object} FormField
 * @property {string} label           - Human-readable field label.
 * @property {string} fieldType       - input | select | textarea | checkbox | radio
 * @property {string} selector        - CSS selector to target the element (in the leaf document).
 * @property {boolean} isRequired     - Whether the field appears required.
 * @property {string} suggestedDataKey - Hint for which resume/profile key maps here
 *   (e.g. "firstName", "email", "workExperience[0].title", "commonAnswers.sponsorship").
 * @property {number[]} [iframePath]   - Indices into nested same-origin iframes from the top document; omit for top-level.
 * @property {string} [inferenceSource] - DOM scan only: id/name/aria blob used to infer Workday repeater scope.
 * @property {number} [wxResumeIndex]   - Set in fieldMapper: resume row index for Workday repeater fields.
 */

/**
 * Hosts where Firecrawl remote extract/scrape is blocked or disallowed (403).
 * Fall back to in-tab DOM scanning instead.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function shouldSkipRemoteExtract(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Scrape a page via Firecrawl's /scrape endpoint and return its content.
 *
 * @param {string} url - The URL to scrape.
 * @returns {Promise<ScrapeResult>}
 */
export async function scrapePageContent(url) {
  if (USE_MOCK) return getMockScrapeResult(url);

  const apiKey = await getResolvedFirecrawlApiKey();
  const res = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown', 'html'] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firecrawl scrape error (${res.status}): ${body}`);
  }

  const json = await res.json();
  const data = json.data ?? json;

  return {
    markdown: data.markdown ?? '',
    rawHtml: data.html ?? '',
    metadata: data.metadata ?? {},
  };
}

/**
 * Extract structured form fields from a page via Firecrawl's /extract endpoint.
 *
 * @param {string} url - The URL of the job application page.
 * @returns {Promise<FormField[]>}
 */
export async function extractFormFields(url) {
  if (USE_MOCK) {
    return getMockFormFields();
  }

  const apiKey = await getResolvedFirecrawlApiKey();
  if (!apiKey) {
    return [];
  }

  // TODO: LLM-based field inference — replace the static schema prompt with
  // a dynamic prompt that also considers the page markdown for smarter mapping.

  const schema = {
    type: 'object',
    properties: {
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            fieldType: { type: 'string', enum: ['input', 'select', 'textarea', 'checkbox', 'radio'] },
            selector: { type: 'string' },
            isRequired: { type: 'boolean' },
            suggestedDataKey: { type: 'string' },
          },
          required: ['label', 'fieldType', 'selector', 'isRequired', 'suggestedDataKey'],
        },
      },
    },
    required: ['fields'],
  };

  const res = await fetch(`${FIRECRAWL_BASE_URL}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      urls: [url],
      prompt: 'Extract every form field on this job application page, including all interactive form controls. For each field, return the label, HTML field type, a CSS selector, whether it is required (look for asterisks or "required" indicators), and a suggestedDataKey that maps to a typical resume field name. IMPORTANT: Detect ALL types of form controls including: native HTML inputs, selects, and textareas; ARIA-based controls like elements with role="radio", role="radiogroup", role="checkbox", role="combobox"; custom dropdown buttons with aria-haspopup="listbox"; and any interactive elements that function as form inputs even if they use custom implementations (common on Workday and other ATS platforms).',
      schema,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Firecrawl extract error (${res.status}): ${body}`);
  }

  const json = await res.json();
  const data = json.data ?? json;
  return data.fields ?? [];
}

// ─── Mock data ──────────────────────────────────────────────────

function getMockScrapeResult(url) {
  return {
    markdown: `# Software Engineer Application\n\nPlease fill out the form below to apply for this position.\n\n**Company:** Acme Corp\n**Location:** Remote\n`,
    rawHtml: '<html><body><h1>Software Engineer Application</h1><form>...</form></body></html>',
    metadata: { title: 'Apply — Acme Corp', sourceURL: url },
  };
}

function getMockFormFields() {
  return [
    { label: 'First Name', fieldType: 'input', selector: '#first-name', isRequired: true, suggestedDataKey: 'firstName' },
    { label: 'Last Name', fieldType: 'input', selector: '#last-name', isRequired: true, suggestedDataKey: 'lastName' },
    { label: 'Email Address', fieldType: 'input', selector: '#email', isRequired: true, suggestedDataKey: 'email' },
    { label: 'Phone Number', fieldType: 'input', selector: '#phone', isRequired: true, suggestedDataKey: 'phone' },
    { label: 'LinkedIn URL', fieldType: 'input', selector: '#linkedin', isRequired: false, suggestedDataKey: 'linkedin' },
    { label: 'Most Recent Job Title', fieldType: 'input', selector: '#job-title', isRequired: true, suggestedDataKey: 'workExperience[0].title' },
    { label: 'Most Recent Company', fieldType: 'input', selector: '#company', isRequired: true, suggestedDataKey: 'workExperience[0].company' },
    { label: 'University / School', fieldType: 'input', selector: '#school', isRequired: false, suggestedDataKey: 'education[0].school' },
    { label: 'Degree', fieldType: 'input', selector: '#degree', isRequired: false, suggestedDataKey: 'education[0].degree' },
    { label: 'Are you authorized to work in the US?', fieldType: 'select', selector: '#work-auth', isRequired: true, suggestedDataKey: 'commonAnswers.workAuthorization' },
    { label: 'Will you require sponsorship?', fieldType: 'select', selector: '#sponsorship', isRequired: true, suggestedDataKey: 'commonAnswers.sponsorship' },
    { label: 'Expected Salary', fieldType: 'input', selector: '#salary', isRequired: false, suggestedDataKey: 'commonAnswers.salary' },
    { label: 'Cover Letter', fieldType: 'textarea', selector: '#cover-letter', isRequired: false, suggestedDataKey: 'coverLetter' },
  ];
}
