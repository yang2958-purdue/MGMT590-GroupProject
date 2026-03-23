/**
 * JobBot content script.
 *
 * Injected into job application pages to handle DOM-level autofill.
 * Communicates with the background service worker via chrome.runtime messages.
 *
 * This script:
 * - Receives resume data and userProfile from the service worker.
 * - Identifies form fields on the page and fills them with matching data.
 * - Detects unknown fields or account-creation forms and pauses.
 * - Sends AUTOFILL_PAUSED messages when manual intervention is needed.
 * - Listens for RESUME_AUTOFILL to continue after manual steps.
 */

/**
 * Listen for messages from the background service worker.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'FILL_FIELDS':
      fillFields(message.resume, message.userProfile);
      break;

    case 'RESUME_AUTOFILL':
      resumeFilling();
      break;

    default:
      break;
  }
});

/**
 * Fill form fields on the current page using resume and profile data.
 * Only uses data from the parsed resume and userProfile object.
 * Never generates or infers data.
 *
 * @param {Object} resume - Parsed resume data.
 * @param {Object} userProfile - User profile Q&A (citizenship, sponsorship, etc.).
 */
function fillFields(resume, userProfile) {
  // TODO: Implement field detection and value injection
  // - Scan for input, select, textarea elements
  // - Match field labels/names/ids to resume or userProfile keys
  // - Fill matched fields
  // - On unknown field or account-creation form, call pauseAndNotify()
}

/**
 * Pause autofill and notify the side panel via the service worker.
 * @param {string} reason - Why autofill was paused.
 */
function pauseAndNotify(reason) {
  chrome.runtime.sendMessage({
    type: 'AUTOFILL_PAUSED',
    reason,
  });
}

/**
 * Resume autofill after the user completes a manual step.
 */
function resumeFilling() {
  // TODO: Continue filling from where we left off
}
