/**
 * Autofill engine module.
 *
 * Injects field values into job application pages via the content script.
 * Only uses data from the parsed resume and a userProfile object.
 * Never generates or infers data.
 */

/**
 * @typedef {import('./resumeParser.js').ResumeData} ResumeData
 * @typedef {import('./storage.js').UserProfile} UserProfile
 */

/**
 * Start autofilling a job application page.
 * Sends resume and userProfile data to the content script in the given tab.
 * The content script handles the actual DOM interaction.
 *
 * When the autofill encounters an unknown field or account-creation form,
 * it pauses and sends a message to the side panel to show a
 * "Paused -- complete this step manually, then resume" banner.
 *
 * @param {number} tabId - The browser tab ID to autofill.
 * @param {ResumeData} resume - The parsed resume data.
 * @param {UserProfile} userProfile - Stored Q&A (citizenship, sponsorship, etc.).
 * @returns {Promise<void>}
 */
export async function autofillPage(tabId, resume, userProfile) {
  // TODO: Implement full autofill orchestration
  // 1. Inject content script into the target tab (if not already injected)
  // 2. Send FILL_FIELDS message with resume + userProfile
  // 3. Listen for AUTOFILL_PAUSED messages from content script
  // 4. Relay pause state to side panel UI

  await chrome.tabs.sendMessage(tabId, {
    type: 'FILL_FIELDS',
    resume,
    userProfile,
  });
}

/**
 * Resume autofill after a manual pause.
 * Sends a RESUME_AUTOFILL message to the content script.
 *
 * @param {number} tabId - The browser tab ID to resume.
 * @returns {Promise<void>}
 */
export async function resumeAutofill(tabId) {
  await chrome.tabs.sendMessage(tabId, {
    type: 'RESUME_AUTOFILL',
  });
}
