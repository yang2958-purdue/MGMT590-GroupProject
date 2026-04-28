/**
 * JobBot content script.
 *
 * Injected into job application pages to handle DOM-level autofill.
 * Communicates with the side panel and service worker via chrome.runtime messages.
 *
 * Message types handled:
 *   EXTRACT_FIELDS_DOM — return FormField[] from a live DOM scan
 *   PREPARE_WORKDAY_REPEATERS — click Add on Work Experience / Education so row fields exist
 *   FILL_FIELDS       — start sequential filling with a FilledField[] array
 *   RESUME_AUTOFILL   — continue after a pause_required field
 *   SKIP_FIELD        — skip the paused field and move on
 *   PAUSE_AUTOFILL    — user-initiated pause from the side panel
 */

import { fillFieldsSequentially, prepareWorkdayRepeatersForAutofill } from '../modules/autofill/fieldFiller.js';
import { scanFormFieldsInDocument } from '../modules/autofill/domFieldScanner.js';

const BOUND = '__jobbotContentScriptMsgBound';

if (!globalThis[BOUND]) {
  globalThis[BOUND] = true;

function emitDebugLog(location, message, data = {}, runId = 'initial', hypothesisId = 'H0') {
  // #region agent log
  fetch('http://127.0.0.1:7503/ingest/4f5420e6-5c84-43bf-a398-b678a72cb864', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'f8a60b',
    },
    body: JSON.stringify({
      sessionId: 'f8a60b',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

let resumeResolver = null;
let isPaused = false;

/**
 * Create a promise that resolves when the user sends RESUME_AUTOFILL or
 * SKIP_FIELD. This is passed into fillFieldsSequentially as the
 * hooks.waitForResume callback.
 * @returns {Promise<"resume"|"skip">}
 */
function waitForResume() {
  isPaused = true;
  return new Promise((resolve) => {
    resumeResolver = resolve;
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'EXTRACT_FIELDS_DOM': {
      const fields = scanFormFieldsInDocument();
      // #region agent log
      emitDebugLog(
        'content.js:onMessage:EXTRACT_FIELDS_DOM',
        'Content script completed DOM field scan',
        {
          href: location.href,
          fieldCount: Array.isArray(fields) ? fields.length : 0,
          fieldTypeCounts: (Array.isArray(fields) ? fields : []).reduce((acc, f) => {
            const k = f?.fieldType || 'unknown';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {}),
        },
        'initial',
        'H5',
      );
      // #endregion
      sendResponse({ ok: true, fields });
      return true;
    }

    case 'PREPARE_WORKDAY_REPEATERS': {
      prepareWorkdayRepeatersForAutofill({
        workExperienceTargetCount: message.workExperienceTargetCount,
        educationAdd: message.educationAdd !== false,
      })
        .then(() => sendResponse({ ok: true }))
        .catch((e) =>
          sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
        );
      return true;
    }

    case 'FILL_FIELDS':
      fillFieldsSequentially(message.fields, message.delayMs, { waitForResume });
      sendResponse({ ok: true });
      break;

    case 'RESUME_AUTOFILL':
      if (resumeResolver) {
        resumeResolver('resume');
        resumeResolver = null;
        isPaused = false;
      }
      sendResponse({ ok: true });
      break;

    case 'SKIP_FIELD':
      if (resumeResolver) {
        resumeResolver('skip');
        resumeResolver = null;
        isPaused = false;
      }
      sendResponse({ ok: true });
      break;

    case 'PAUSE_AUTOFILL':
      isPaused = true;
      sendResponse({ ok: true });
      break;

    default:
      break;
  }
});

} // only register message listener once per isolated world
