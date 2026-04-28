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
import { USE_MOCK } from '../../config/firecrawl.config.js';
import { getResolvedFirecrawlApiKey } from '../../lib/apiKeys.js';
import {
  getResume,
  getUserProfile,
  getAutofillState,
  setAutofillState,
  getSelectedJob,
} from '../storage.js';
import { FILL_DELAY_MS, AUTO_EXPAND_WORKDAY_REPEATERS } from '../../config/autofill.config.js';

/**
 * @typedef {import('./fieldMapper.js').FilledField} FilledField
 */

/**
 * Extract company name from page URL or form fields.
 * Used when user navigates directly to career site without selecting a job.
 * 
 * @param {string} pageUrl - Current page URL
 * @param {import('../scraper/firecrawlAdapter.js').FormField[]} formFields - Detected form fields
 * @returns {string} Company name or empty string
 */
function extractCompanyFromPage(pageUrl, formFields) {
  try {
    const url = new URL(pageUrl);
    
    // Strategy 1: Extract from Workday subdomain pattern (e.g., leidos.wd1.myworkdayjobs.com)
    if (url.hostname.includes('myworkdayjobs.com')) {
      const subdomain = url.hostname.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'wd1' && subdomain !== 'wd5') {
        // Capitalize first letter
        return subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
      }
    }
    
    // Strategy 2: Look for company name in "previously worked for [Company]" radio button labels
    const previousWorkQuestions = formFields.filter(f => 
      f.fieldType === 'radio' && 
      f.label && 
      /previously\s+work|worked\s+for|prior\s+employ/i.test(f.label)
    );
    
    for (const field of previousWorkQuestions) {
      // Match pattern: "...for XYZ (" or "...for XYZ)" or "...for XYZ?"
      const match = field.label.match(/\bfor\s+([A-Z][A-Za-z0-9&\s]+?)[\s]*[\(\)\?\*]/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Strategy 3: Extract from common career site domains
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('careers.')) {
      const parts = hostname.replace('careers.', '').split('.');
      if (parts[0] && parts[0] !== 'www') {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }
    
  } catch (e) {
    console.warn('[extractCompanyFromPage] Failed to parse URL:', e);
  }
  
  return '';
}

/**
 * @typedef {Object} SkippedRequiredField
 * @property {string} label - Field label
 * @property {string} fieldType - Field type (input, select, etc.)
 * @property {string} [suggestedDataKey] - What data key was expected
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
 * @property {number|null} [contentFrameId] - Frame ID where the content script runs (for messaging).
 * @property {SkippedRequiredField[]} [skippedRequired] - Required fields that were skipped due to missing profile data.
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
    contentFrameId: null,
  });

  /** @type {import('../scraper/firecrawlAdapter.js').FormField[]} */
  let formFields = [];
  /** @type {number|null} */
  let contentFrameId = null;

  if (USE_MOCK) {
    formFields = await extractFormFields(pageUrl);
  } else if (!shouldSkipRemoteExtract(pageUrl) && (await getResolvedFirecrawlApiKey())) {
    try {
      formFields = await extractFormFields(pageUrl);
    } catch {
      formFields = [];
    }
  }

  // ALWAYS run DOM scan to supplement Firecrawl (catches radio buttons it misses)
  const scan = await requestDomFieldScan(tabId);
  
  if (scan.fields.length > 0) {
    contentFrameId = scan.frameId;
    
    if (formFields.length > 0) {
      // Merge Firecrawl + DOM scan results
      const firecrawlSelectors = new Set(formFields.map(f => f.selector));
      
      // Add fields that DOM found but Firecrawl missed
      const additionalFields = scan.fields.filter(f => !firecrawlSelectors.has(f.selector));
      formFields = [...formFields, ...additionalFields];
    } else {
      // No Firecrawl results, use DOM scan entirely
      formFields = scan.fields;
    }
  }

  if (!formFields.length) {
    const scanDebug = scan?.debug ? ` [scan: ${scan.debug}]` : '';
    const msg =
      'No fillable fields were found. Open the application step where the form is visible (some career sites load the form inside a frame), then try again.' +
      scanDebug;
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

  if (!formFields.length) {
    const msg =
      'No fillable fields were found. Open the application step where the form is visible (some career sites load the form inside a frame), then try again.';
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

  if (AUTO_EXPAND_WORKDAY_REPEATERS && shouldPrepareWorkdayRepeaters(resume)) {
    try {
      const expLen = resume?.experience?.length ?? 0;
      const eduLen = resume?.education?.length ?? 0;
      const workExperienceTargetCount = expLen > 0 ? Math.min(expLen, 10) : 0;
      const educationTargetCount = eduLen > 0 ? Math.min(eduLen, 10) : 0;
      await tabSendMessageWithContentScriptFallback(
        tabId,
        {
          type: 'PREPARE_WORKDAY_REPEATERS',
          workExperienceTargetCount,
          educationTargetCount,
        },
        { injectFrameId: typeof contentFrameId === 'number' ? contentFrameId : undefined },
      );
    } catch {
      /* ignore — mapping still runs with whatever fields exist */
    }
    await delay(1200);
    const scanAfter = await requestDomFieldScan(tabId);
    if (scanAfter.fields.length) {
      formFields = scanAfter.fields;
      if (typeof scanAfter.frameId === 'number') contentFrameId = scanAfter.frameId;
    }
  }

  const selectedJob = await getSelectedJob();
  let targetCompany = selectedJob?.company || '';
  
  // Fallback: extract company from current page if not selected from job results
  if (!targetCompany) {
    targetCompany = extractCompanyFromPage(pageUrl, formFields);
  }
  
  const filledFields = mapFields(formFields, resume, profile, targetCompany);

  const nonSkipped = filledFields.filter((f) => f.status !== 'skipped');
  
  // Track required fields that were skipped (missing profile data)
  const skippedRequired = filledFields
    .filter((f) => f.status === 'skipped' && f.field.isRequired)
    .map((f) => ({
      label: f.field.label || 'Unlabeled field',
      fieldType: f.field.fieldType,
      suggestedDataKey: f.field.suggestedDataKey,
    }));

  const state = {
    tabId,
    jobUrl: pageUrl,
    fields: filledFields,
    currentIndex: 0,
    totalFields: nonSkipped.length,
    status: 'filling',
    contentFrameId,
    skippedRequired: skippedRequired.length > 0 ? skippedRequired : undefined,
  };
  await setAutofillState(state);

  try {
    await tabSendMessageWithContentScriptFallback(
      tabId,
      {
        type: 'FILL_FIELDS',
        fields: filledFields,
        delayMs: FILL_DELAY_MS,
      },
      { injectFrameId: typeof contentFrameId === 'number' ? contentFrameId : undefined },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await setAutofillState({
      ...state,
      status: 'error',
      errorMessage: msg || 'Could not reach the page to fill fields.',
    });
    throw new Error(msg || 'Could not reach the page to fill fields.');
  }

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

  await tabSendMessageWithContentScriptFallback(
    tabId,
    { type: 'RESUME_AUTOFILL' },
    { injectFrameId: typeof state?.contentFrameId === 'number' ? state.contentFrameId : undefined },
  );
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

  await tabSendMessageWithContentScriptFallback(
    tabId,
    { type: 'SKIP_FIELD' },
    { injectFrameId: typeof state?.contentFrameId === 'number' ? state.contentFrameId : undefined },
  );
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

  await tabSendMessageWithContentScriptFallback(
    tabId,
    { type: 'PAUSE_AUTOFILL' },
    { injectFrameId: typeof state?.contentFrameId === 'number' ? state.contentFrameId : undefined },
  );
}

// TODO: Multi-page support — after page complete, detect "Next" / "Continue"
// buttons and call runAutofillPipeline again for the next page.

// ─── Helpers (tabSendMessageWithContentScriptFallback used above; function hoisted) ───

/**
 * Wait for the next animation frame (side panel). Used after programmatic inject so the
 * tab's bundled ES module can finish loading its split chunk before onMessage exists.
 * @returns {Promise<void>}
 */
function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

/**
 * Send a message to the tab's content script. If no listener exists (e.g. user
 * reloaded the extension but not the page), inject `content/content.js` and retry.
 * Post-inject: executeScript can resolve before the injected script finishes registering
 * listeners, so we poll sendMessage across animation frames (not setTimeout).
 * @param {number} tabId
 * @param {Object} message
 * @param {{ injectFrameId?: number, skipInitialSend?: boolean }} [options]
 * @returns {Promise<*>}
 */
function tabSendMessageWithContentScriptFallback(tabId, message, options = {}) {
  const injectFrameId = options.injectFrameId;
  const skipInitialSend = options.skipInitialSend === true;

  // Main frame: omit frameId in sendMessage and use { tabId } only for inject.
  // frameId 0 is not reliably the same as "main" in tabs.sendMessage options.
  const injectTarget =
    typeof injectFrameId === 'number' && injectFrameId !== 0
      ? { tabId, frameIds: [injectFrameId] }
      : { tabId };

  const MAX_FRAMES_AFTER_INJECT = 120;

  const sendOnce = () =>
    new Promise((resolve, reject) => {
      const done = (/** @type {unknown} */ resp) => {
        const err = chrome.runtime.lastError?.message ?? null;
        if (err) reject(new Error(err));
        else resolve(resp);
      };

      if (typeof injectFrameId === 'number' && injectFrameId !== 0) {
        chrome.tabs.sendMessage(tabId, message, { frameId: injectFrameId }, done);
      } else {
        chrome.tabs.sendMessage(tabId, message, done);
      }
    });

  const runAfterInject = async () => {
    await chrome.scripting.executeScript({
      target: injectTarget,
      files: ['content/content.js'],
    });

    for (let f = 0; f < MAX_FRAMES_AFTER_INJECT; f++) {
      try {
        const resp = await sendOnce();
        return resp;
      } catch (e2) {
        const m2 = String(e2.message || e2);
        if (!/Receiving end does not exist|Could not establish connection/i.test(m2)) {
          throw e2;
        }
        await nextFrame();
      }
    }
    return sendOnce();
  };

  if (skipInitialSend) {
    return runAfterInject();
  }

  return sendOnce().catch(async (e1) => {
    const msg = String(e1.message || e1);
    if (!/Receiving end does not exist|Could not establish connection/i.test(msg)) {
      throw e1;
    }
    return runAfterInject();
  });
}

/**
 * Ask the content script to scan the live DOM for form fields. Probes every frame
 * (career sites often host the apply form in a cross-origin iframe).
 * @param {number} tabId
 * @returns {Promise<{ fields: import('../scraper/firecrawlAdapter.js').FormField[], frameId: number|null, debug?: string }>}
 */
async function requestDomFieldScan(tabId) {
  try {
    const probeResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const sel =
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]),' +
          'select:not([disabled]),textarea:not([disabled]),' +
          'button[aria-haspopup="listbox"]:not([disabled]),' +
          '[role="combobox"]:not([aria-disabled="true"]),' +
          '[role="radio"]:not([aria-disabled="true"]),' +
          '[role="radiogroup"]:not([aria-disabled="true"])';

        /** @type {(Document|ShadowRoot)[]} */
        const roots = [document];
        let count = 0;
        while (roots.length) {
          const root = roots.pop();
          if (!root) continue;
          try {
            count += root.querySelectorAll(sel).length;
          } catch {
            // Ignore selector issues in unusual roots.
          }
          let hosts;
          try {
            hosts = root.querySelectorAll('*');
          } catch {
            continue;
          }
          for (const el of hosts) {
            if (el.shadowRoot) roots.push(el.shadowRoot);
          }
        }

        return { n: count, href: location.href };
      },
    });

    /** @type {{ frameId: number; count: number }[]} */
    const ranked = [];
    let probeErrors = 0;
    for (const r of probeResults ?? []) {
      if (r.error) {
        probeErrors += 1;
        continue;
      }
      if (typeof r.frameId !== 'number') continue;
      const res = r.result;
      const n =
        res && typeof res === 'object' && 'n' in res
          ? Number(res.n)
          : typeof res === 'number'
            ? res
            : 0;
      ranked.push({ frameId: r.frameId, count: Number.isFinite(n) ? n : 0 });
    }
    ranked.sort((a, b) => b.count - a.count);

    let extractAttempts = 0;
    let extractErrors = 0;
    for (const frame of ranked) {
      try {
        extractAttempts += 1;
        const resp = await tabSendMessageWithContentScriptFallback(
          tabId,
          { type: 'EXTRACT_FIELDS_DOM' },
          { injectFrameId: frame.frameId, skipInitialSend: true },
        );
        if (resp?.fields?.length) {
          return {
            fields: resp.fields,
            frameId: frame.frameId,
            debug: `probeFrames=${ranked.length},probeErrors=${probeErrors},extractAttempts=${extractAttempts},extractErrors=${extractErrors},path=content-script`,
          };
        }
      } catch {
        extractErrors += 1;
        // try next frame
      }
    }

    try {
      const resp = await tabSendMessageWithContentScriptFallback(tabId, { type: 'EXTRACT_FIELDS_DOM' });
      if (resp?.fields?.length) {
        return {
          fields: resp.fields,
          frameId: 0,
          debug: `probeFrames=${ranked.length},probeErrors=${probeErrors},extractAttempts=${extractAttempts},extractErrors=${extractErrors},path=content-script-main`,
        };
      }
    } catch {
      // fall through
    }

    // Fallback: direct executeScript-based extraction (bypasses content-script messaging/listener issues).
    const inline = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const controls = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]),' +
            'select:not([disabled]),textarea:not([disabled]),' +
            'button[aria-haspopup="listbox"]:not([disabled]),' +
            '[role="combobox"]:not([aria-disabled="true"]),' +
            '[role="radio"]:not([aria-disabled="true"]),' +
            '[role="radiogroup"]:not([aria-disabled="true"])',
        );

        const out = [];
        for (const el of controls) {
          if (!(el instanceof HTMLElement)) continue;
          const type = el instanceof HTMLInputElement ? (el.type || 'text').toLowerCase() : '';
          if (type === 'file') continue;

          let marker = el.getAttribute('data-jobbot-af');
          if (!marker) {
            marker = `jb-inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            el.setAttribute('data-jobbot-af', marker);
          }
          const selector = `[data-jobbot-af="${marker.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;

          let label = '';
          if (el.id) {
            const byFor = document.querySelector(`label[for="${el.id}"]`);
            if (byFor?.textContent) label = byFor.textContent.trim();
          }
          if (!label) label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';

          const role = (el.getAttribute('role') || '').toLowerCase();
          let fieldType = 'input';
          if (el instanceof HTMLTextAreaElement) fieldType = 'textarea';
          else if (el instanceof HTMLSelectElement) fieldType = 'select';
          else if (type === 'checkbox' || role === 'checkbox') fieldType = 'checkbox';
          else if (type === 'radio' || role === 'radio' || role === 'radiogroup') fieldType = 'radio';
          else if (role === 'combobox' || (el.getAttribute('aria-haspopup') || '').toLowerCase() === 'listbox') fieldType = 'select';

          out.push({
            label: label || fieldType,
            fieldType,
            selector,
            isRequired:
              (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) &&
              (el.required || el.getAttribute('aria-required') === 'true'),
            suggestedDataKey: '',
            inferenceSource: [
              label,
              (el.id || '').replace(/[_-]+/g, ' '),
              (el.getAttribute('data-automation-id') || '').replace(/[_-]+/g, ' '),
              (el.getAttribute('name') || '').replace(/[_-]+/g, ' '),
            ]
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim(),
          });
        }
        return { fields: out, href: location.href };
      },
    });

    let best = null;
    for (const r of inline ?? []) {
      if (r.error) continue;
      const fields = Array.isArray(r.result?.fields) ? r.result.fields : [];
      if (!best || fields.length > best.fields.length) {
        best = { frameId: typeof r.frameId === 'number' ? r.frameId : 0, fields };
      }
    }
    if (best && best.fields.length) {
      return {
        fields: best.fields,
        frameId: best.frameId,
        debug: `probeFrames=${ranked.length},probeErrors=${probeErrors},extractAttempts=${extractAttempts},extractErrors=${extractErrors},path=inline-exec,inlineFields=${best.fields.length}`,
      };
    }

    return {
      fields: [],
      frameId: null,
      debug: `probeFrames=${ranked.length},probeErrors=${probeErrors},extractAttempts=${extractAttempts},extractErrors=${extractErrors},path=none`,
    };
  } catch {
    return { fields: [], frameId: null, debug: 'requestDomFieldScan-outer-catch' };
  }
}

/**
 * @param {import('../resumeParser.js').ResumeData | null} resume
 */
function shouldPrepareWorkdayRepeaters(resume) {
  if (!resume) return false;
  const ex = resume.experience?.[0];
  const ed = resume.education?.[0];
  const hasWork = !!(ex && (String(ex.title || '').trim() || String(ex.company || '').trim()));
  const hasEdu = !!(ed && (String(ed.school || '').trim() || String(ed.degree || '').trim()));
  return hasWork || hasEdu;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
