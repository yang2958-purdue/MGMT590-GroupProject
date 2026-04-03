/**
 * JobBot background service worker.
 *
 * Responsibilities:
 * - Open the side panel when the extension action is clicked.
 * - Relay autofill status messages from content scripts to the side panel.
 *
 * The side panel (autofillController.js) handles orchestration directly,
 * so the service worker only forwards content-script messages that the
 * side panel's chrome.runtime.onMessage listener picks up automatically.
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('sidePanel.setPanelBehavior failed:', err));

// BACKLOG: Metrics tracking (applications sent, time saved)
