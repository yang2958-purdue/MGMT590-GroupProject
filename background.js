// Background service worker for Chrome extension

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward cursor status updates to all tabs
    if (message.type === 'cursorStatusUpdate') {
        chrome.runtime.sendMessage(message);
    }
    
    return true;
});

console.log('Resume Assistant background service worker loaded');

