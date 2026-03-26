/**
 * Autofill controller module.
 *
 * Orchestrates single-page autofill on the **active application tab**:
 * extract fields (Firecrawl when allowed, else DOM scan) → map resume/profile → fill via content script.
 *
 * Runs in the side panel context. Communicates with the content script
 * via chrome.tabs.sendMessage / chrome.runtime.onMessage.
 */

import {
  extractFormFields,
  shouldSkipRemoteExtract,
} from '../scraper/firecrawlAdapter.js';
import { mapFields } from './fieldMapper.js';
import { FIRECRAWL_API_KEY, USE_MOCK } from '../../config/firecrawl.config.js';
import {
  getResume,
  getUserProfile,
  getAutofillState,
  setAutofillState,
} from '../storage.js';
import { FILL_DELAY_MS } from '../../config/autofill.config.js';

/**
 * @typedef {import('./fieldMapper.js').FilledField} FilledField
 */

/**
 * @typedef {Object} AutofillState
 * @property {number|null} tabId         - Chrome tab ID where autofill is active.
 * @property {string} jobUrl             - URL of the page being filled (storage key name kept for compatibility).
 * @property {FilledField[]} fields      - The mapped fields array.
 * @property {number} currentIndex       - Index of the field being filled.
 * @property {"scanning"|"filling"|"paused"|"complete"|"error"} status
 * @property {number} totalFields        - Total field count (for progress display).
 * @property {string} [errorMessage]     - Error details when status is "error".
 */

/**
 * Start autofill on whichever tab is currently active in the focused browser window.
 * User should already be on the external application page (e.g. Workday).
 *
 * @returns {Promise<AutofillState>}
 */
export async function startAutofillOnActiveTab() {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error('No active tab found. Focus a browser tab with the application form.');
  }
  const url = tab.url || '';
  if (!url) {
    throw new Error('Active tab has no URL.');
  }
  const blocked = getUrlBlockReason(url);
  if (blocked) {
    throw new Error(blocked);
  }

  await waitForTabLoad(tab.id);
  return runAutofillPipeline(tab.id, url);
}

/**
 * Run extract → map → fill on an existing tab.
 *
 * @param {number} tabId
 * @param {string} pageUrl - Page URL (for Firecrawl and stored state).
 * @returns {Promise<AutofillState>}
 */
export async function runAutofillPipeline(tabId, pageUrl) {
  await setAutofillState({
    tabId,
    jobUrl: pageUrl,
    fields: [],
    currentIndex: 0,
    totalFields: 0,
    status: 'scanning',
  });

  /** @type {import('../scraper/firecrawlAdapter.js').FormField[]} */
  let formFields = [];

  if (USE_MOCK) {
    formFields = await extractFormFields(pageUrl);
  } else if (!shouldSkipRemoteExtract(pageUrl) && FIRECRAWL_API_KEY.trim()) {
    try {
      formFields = await extractFormFields(pageUrl);
    } catch {
      formFields = [];
    }
  }

  if (!formFields.length) {
    formFields = await requestDomFieldScan(tabId);
  }

  if (!formFields.length) {
    const msg =
      'No form fields found on this page. Navigate to the application form (e.g. Workday, Greenhouse), then try again.';
    await setAutofillState({
      tabId,
      jobUrl: pageUrl,
      fields: [],
      currentIndex: 0,
      totalFields: 0,
      status: 'error',
      errorMessage: msg,
    });
    throw new Error(msg);
  }

  const resume = await getResume();
  const profile = await getUserProfile();
  const filledFields = mapFields(formFields, resume, profile);

  const nonSkipped = filledFields.filter((f) => f.status !== 'skipped');

  const state = {
    tabId,
    jobUrl: pageUrl,
    fields: filledFields,
    currentIndex: 0,
    totalFields: nonSkipped.length,
    status: 'filling',
  };
  await setAutofillState(state);

  await chrome.tabs.sendMessage(tabId, {
    type: 'FILL_FIELDS',
    fields: filledFields,
    delayMs: FILL_DELAY_MS,
  });

  return state;
}

/**
 * @param {string} url
 * @returns {string|null} Error message if blocked, else null.
 */
function getUrlBlockReason(url) {
  try {
    const u = new URL(url);
    const protocol = u.protocol.toLowerCase();
    if (protocol === 'chrome:' || protocol === 'edge:' || protocol === 'about:') {
      return 'Cannot autofill this page type. Open a normal web application tab.';
    }
    if (protocol === 'chrome-extension:' || protocol === 'moz-extension:') {
      return 'Cannot autofill extension pages. Open the job application site in a regular tab.';
    }
    if (u.hostname === 'newtab' || url === 'chrome://newtab/' || url.startsWith('chrome://new-tab-page')) {
      return 'Select the tab that has the application form (not the new tab page).';
    }
    return null;
  } catch {
    return 'Invalid tab URL.';
  }
}

/**
 * Resume autofill after a pause. Sends RESUME_AUTOFILL to the content script.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export async function resumeAutofill(tabId) {
  const state = await getAutofillState();
  if (state) {
    state.status = 'filling';
    await setAutofillState(state);
  }

  await chrome.tabs.sendMessage(tabId, { type: 'RESUME_AUTOFILL' });
}

/**
 * Skip the currently paused field and continue with the next one.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export async function skipField(tabId) {
  const state = await getAutofillState();
  if (state) {
    state.status = 'filling';
    await setAutofillState(state);
  }

  await chrome.tabs.sendMessage(tabId, { type: 'SKIP_FIELD' });
}

/**
 * Pause the autofill from the side panel (user-initiated).
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export async function pauseAutofill(tabId) {
  const state = await getAutofillState();
  if (state) {
    state.status = 'paused';
    await setAutofillState(state);
  }

  await chrome.tabs.sendMessage(tabId, { type: 'PAUSE_AUTOFILL' });
}

// TODO: Multi-page support — after page complete, detect "Next" / "Continue"
// buttons and call runAutofillPipeline again for the next page.

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Ask the content script in `tabId` to scan the live DOM for form fields.
 * @param {number} tabId
 * @returns {Promise<import('../scraper/firecrawlAdapter.js').FormField[]>}
 */
function requestDomFieldScan(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_FIELDS_DOM' }, (resp) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      resolve(resp?.fields ?? []);
    });
  });
}

/**
 * Wait for a tab to finish loading (status === 'complete').
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}
