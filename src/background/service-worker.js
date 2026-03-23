/**
 * JobBot background service worker.
 *
 * Responsibilities:
 * - Open the side panel when the extension action is clicked.
 * - Relay messages between the side panel, content scripts, and modules.
 * - Coordinate autofill start/pause/resume across tabs.
 */

// Open side panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('sidePanel.setPanelBehavior failed:', err));

/**
 * Message handler for communication between extension components.
 * Content scripts and the side panel send messages here.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_AUTOFILL':
      handleStartAutofill(message, sender);
      break;

    case 'AUTOFILL_PAUSED':
      handleAutofillPaused(message, sender);
      break;

    case 'RESUME_AUTOFILL':
      handleResumeAutofill(message, sender);
      break;

    default:
      break;
  }

  return false;
});

/**
 * Inject the content script and begin autofilling the active tab.
 * @param {Object} message - { type, resume, userProfile }
 * @param {chrome.runtime.MessageSender} sender
 */
function handleStartAutofill(message, sender) {
  // TODO: Inject content script into active tab, send resume + userProfile data
}

/**
 * The content script detected an unknown field or account-creation form.
 * Relay the pause event to the side panel.
 * @param {Object} message - { type, reason }
 * @param {chrome.runtime.MessageSender} sender
 */
function handleAutofillPaused(message, sender) {
  // TODO: Forward pause message to side panel for banner display
}

/**
 * User clicked "Resume" in the pause banner. Relay to content script.
 * @param {Object} message - { type, tabId }
 * @param {chrome.runtime.MessageSender} sender
 */
function handleResumeAutofill(message, sender) {
  // TODO: Send resume signal to content script in the specified tab
}

// BACKLOG: Metrics tracking (applications sent, time saved)
