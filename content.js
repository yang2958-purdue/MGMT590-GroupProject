// Content script for cursor control and form field detection
let cursorControlActive = false;
let animationId = null;
let cursorElement = null;
let detectedFields = [];
let currentFieldIndex = 0;
const speed = 2; // Speed of movement between fields (seconds per field)
let fieldInteractionInterval = null;

// Detect all form fields on the page
function detectFormFields() {
    detectedFields = [];
    
    // Text inputs
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="url"], input:not([type])');
    textInputs.forEach(input => {
        if (isVisible(input)) {
            detectedFields.push({
                element: input,
                type: 'text',
                label: getFieldLabel(input),
                filled: input.value.length > 0
            });
        }
    });
    
    // Textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        if (isVisible(textarea)) {
            detectedFields.push({
                element: textarea,
                type: 'textarea',
                label: getFieldLabel(textarea),
                filled: textarea.value.length > 0
            });
        }
    });
    
    // Dropdowns/Select elements
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (isVisible(select)) {
            detectedFields.push({
                element: select,
                type: 'dropdown',
                label: getFieldLabel(select),
                filled: select.selectedIndex > 0
            });
        }
    });
    
    // Radio buttons (group them)
    const radioGroups = {};
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        if (isVisible(radio)) {
            const name = radio.name || 'unnamed';
            if (!radioGroups[name]) {
                radioGroups[name] = {
                    elements: [],
                    label: getFieldLabel(radio),
                    checked: false
                };
            }
            radioGroups[name].elements.push(radio);
            if (radio.checked) radioGroups[name].checked = true;
        }
    });
    
    Object.values(radioGroups).forEach(group => {
        if (group.elements.length > 0) {
            detectedFields.push({
                element: group.elements[0],
                type: 'radio',
                label: group.label,
                filled: group.checked,
                group: group.elements
            });
        }
    });
    
    // Checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (isVisible(checkbox)) {
            detectedFields.push({
                element: checkbox,
                type: 'checkbox',
                label: getFieldLabel(checkbox),
                filled: checkbox.checked
            });
        }
    });
    
    console.log(`✅ Detected ${detectedFields.length} form fields on page`);
    
    // Notify side panel
    notifyFieldCount(detectedFields.length);
    
    return detectedFields;
}

// Check if element is visible
function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 
        && rect.height > 0 
        && style.display !== 'none' 
        && style.visibility !== 'hidden'
        && style.opacity !== '0';
}

// Get label for form field
function getFieldLabel(element) {
    // Try to find associated label
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return label.textContent.trim();
    }
    
    // Try parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    // Try placeholder
    if (element.placeholder) return element.placeholder;
    
    // Try name attribute
    if (element.name) return element.name.replace(/[_-]/g, ' ');
    
    // Try aria-label
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
    
    return 'Unknown field';
}

// Create custom cursor element
function createCursor() {
    cursorElement = document.createElement('div');
    cursorElement.id = 'resume-assistant-cursor';
    cursorElement.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #667eea 0%, #764ba2 100%);
        border: 2px solid white;
        border-radius: 50%;
        pointer-events: none;
        z-index: 2147483647;
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
        transition: all 0.1s ease;
        display: none;
    `;
    document.body.appendChild(cursorElement);
}

// Highlight a form field
function highlightField(field) {
    // Remove previous highlights
    document.querySelectorAll('.resume-assistant-highlight').forEach(el => {
        el.classList.remove('resume-assistant-highlight');
    });
    
    // Add highlight to current field
    field.element.classList.add('resume-assistant-highlight');
    
    // Scroll into view
    field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Move cursor indicator to field
    const rect = field.element.getBoundingClientRect();
    if (cursorElement) {
        cursorElement.style.left = `${rect.left + rect.width / 2}px`;
        cursorElement.style.top = `${rect.top + rect.height / 2}px`;
        cursorElement.style.display = 'block';
    }
}

// Interact with form field (click, focus, etc.)
function interactWithField(field) {
    console.log(`📝 Interacting with ${field.type}: ${field.label}`);
    
    const element = field.element;
    
    // Highlight the field
    highlightField(field);
    
    // Focus the element
    element.focus();
    
    // Trigger click event
    element.click();
    
    // Specific actions based on field type
    switch (field.type) {
        case 'text':
        case 'textarea':
            // For text fields, just focus (user can type or we can auto-fill later)
            element.style.backgroundColor = '#e3f2fd';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 2000);
            break;
            
        case 'dropdown':
            // Open dropdown
            element.focus();
            // Optionally select first non-empty option
            if (element.options.length > 1 && element.selectedIndex === 0) {
                element.selectedIndex = 1;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;
            
        case 'radio':
            // Click first radio in group if none selected
            if (field.group && !field.filled) {
                field.group[0].click();
                field.group[0].dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;
            
        case 'checkbox':
            // Toggle checkbox if not checked
            if (!element.checked) {
                element.click();
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;
    }
}

// Move through fields sequentially
function moveToNextField() {
    if (!cursorControlActive || detectedFields.length === 0) return;
    
    // Get current field
    const field = detectedFields[currentFieldIndex];
    
    if (field) {
        interactWithField(field);
    }
    
    // Move to next field
    currentFieldIndex = (currentFieldIndex + 1) % detectedFields.length;
}

// Start field interaction
function startFieldInteraction() {
    // Detect all fields first
    detectFormFields();
    
    if (detectedFields.length === 0) {
        console.log('⚠️ No form fields detected on this page');
        return;
    }
    
    // Create cursor element
    if (!cursorElement) {
        createCursor();
    }
    
    // Start moving through fields
    currentFieldIndex = 0;
    moveToNextField();
    
    // Continue moving through fields at intervals
    fieldInteractionInterval = setInterval(() => {
        moveToNextField();
    }, speed * 1000);
}

// Stop field interaction
function stopFieldInteraction() {
    if (fieldInteractionInterval) {
        clearInterval(fieldInteractionInterval);
        fieldInteractionInterval = null;
    }
    
    // Remove highlights
    document.querySelectorAll('.resume-assistant-highlight').forEach(el => {
        el.classList.remove('resume-assistant-highlight');
    });
    
    // Hide cursor
    if (cursorElement) {
        cursorElement.style.display = 'none';
    }
    
    currentFieldIndex = 0;
}

// Notify side panel of field count
function notifyFieldCount(count) {
    try {
        chrome.runtime.sendMessage({
            type: 'fieldCountUpdate',
            count: count,
            fields: detectedFields.map(f => ({
                type: f.type,
                label: f.label,
                filled: f.filled
            }))
        }, (response) => {
            if (chrome.runtime.lastError) {
                // Side panel not open, that's OK
            }
        });
    } catch (error) {
        // Silently fail if side panel isn't available
    }
}

// Start cursor control
function startCursorControl() {
    if (cursorControlActive) return;
    
    cursorControlActive = true;
    
    // Start field interaction instead of circular motion
    startFieldInteraction();
    
    // Notify side panel
    notifySidePanel();
    
    console.log('Cursor control activated - scanning for form fields');
}

// Stop cursor control
function stopCursorControl() {
    if (!cursorControlActive) return;
    
    cursorControlActive = false;
    
    // Stop field interaction
    stopFieldInteraction();
    
    // Notify side panel
    notifySidePanel();
    
    console.log('Cursor control deactivated');
}

// Toggle cursor control
function toggleCursorControl() {
    if (cursorControlActive) {
        stopCursorControl();
    } else {
        startCursorControl();
    }
}

// Notify side panel of status change
function notifySidePanel() {
    try {
        chrome.runtime.sendMessage({
            type: 'cursorStatusUpdate',
            isActive: cursorControlActive
        }, (response) => {
            // Ignore errors if side panel isn't open
            if (chrome.runtime.lastError) {
                // Side panel not open, that's OK
            }
        });
    } catch (error) {
        // Silently fail if side panel isn't available
    }
}

// Send key press info to side panel for debugging
function notifyKeyPress(keyInfo) {
    try {
        chrome.runtime.sendMessage({
            type: 'keyPressDebug',
            keyInfo: keyInfo
        }, (response) => {
            // Ignore errors if side panel isn't open
            if (chrome.runtime.lastError) {
                // Side panel not open, that's OK
            }
        });
    } catch (error) {
        // Silently fail if side panel isn't available
    }
}

// Listen for keyboard events
document.addEventListener('keydown', (e) => {
    // Debug: Log all key presses with modifier keys
    if (e.ctrlKey || e.shiftKey || e.altKey) {
        const keyInfo = {
            key: e.key,
            keyCode: e.keyCode,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
        };
        
        console.log('Key pressed:', keyInfo);
        
        // Send to side panel for visual feedback
        notifyKeyPress(keyInfo);
    }
    
    // Ctrl+Shift+Z combination
    if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z' || e.keyCode === 90)) {
        console.log('✅ Ctrl+Shift+Z detected! Toggling cursor control...');
        e.preventDefault(); // Prevent any default browser behavior
        toggleCursorControl();
    }
});

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getCursorStatus') {
        sendResponse({ isActive: cursorControlActive });
    }
    return true;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCursorControl();
    if (cursorElement && cursorElement.parentNode) {
        cursorElement.parentNode.removeChild(cursorElement);
    }
});

// Detect browser for compatibility
function detectBrowser() {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf("Edg") > -1) {
        return "Edge";
    } else if (userAgent.indexOf("Chrome") > -1) {
        return "Chrome";
    } else if (userAgent.indexOf("Chromium") > -1) {
        return "Chromium";
    }
    return "Unknown";
}

const browserName = detectBrowser();
console.log(`🌐 Browser detected: ${browserName}`);

// Add CSS for field highlighting
const style = document.createElement('style');
style.textContent = `
    .resume-assistant-highlight {
        outline: 3px solid #667eea !important;
        outline-offset: 2px !important;
        background-color: #f0f4ff !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.5) !important;
    }
`;
document.head.appendChild(style);

// Scan for fields when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        detectFormFields();
    }, 1000);
});

// Re-scan if DOM changes significantly
const observer = new MutationObserver(() => {
    if (!cursorControlActive) {
        detectFormFields();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log(`Resume Assistant content script loaded. Press Ctrl+Shift+Z to toggle cursor control. (Running on ${browserName})`);

