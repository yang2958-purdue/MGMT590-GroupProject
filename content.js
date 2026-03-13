// Content script for cursor control
let cursorControlActive = false;
let animationId = null;
let cursorElement = null;
let angle = 0;
const radius = 100; // Radius of the circle in pixels
const speed = 0.05; // Speed of rotation
let centerX = window.innerWidth / 2;
let centerY = window.innerHeight / 2;

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

// Move cursor in a circle
function moveCursorInCircle() {
    if (!cursorControlActive) return;
    
    // Calculate position on circle
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Update cursor position
    if (cursorElement) {
        cursorElement.style.left = `${x}px`;
        cursorElement.style.top = `${y}px`;
        cursorElement.style.display = 'block';
    }
    
    // Move mouse cursor (dispatch mouse event)
    const element = document.elementFromPoint(x, y);
    if (element) {
        const event = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        element.dispatchEvent(event);
    }
    
    // Increment angle for next frame
    angle += speed;
    if (angle >= Math.PI * 2) {
        angle = 0;
    }
    
    // Continue animation
    animationId = requestAnimationFrame(moveCursorInCircle);
}

// Start cursor control
function startCursorControl() {
    if (cursorControlActive) return;
    
    cursorControlActive = true;
    
    // Reset center to current viewport center
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
    angle = 0;
    
    // Create cursor element if it doesn't exist
    if (!cursorElement) {
        createCursor();
    }
    
    // Start animation
    moveCursorInCircle();
    
    // Notify side panel
    notifySidePanel();
    
    console.log('Cursor control activated');
}

// Stop cursor control
function stopCursorControl() {
    if (!cursorControlActive) return;
    
    cursorControlActive = false;
    
    // Cancel animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Hide cursor element
    if (cursorElement) {
        cursorElement.style.display = 'none';
    }
    
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
    chrome.runtime.sendMessage({
        type: 'cursorStatusUpdate',
        isActive: cursorControlActive
    });
}

// Listen for keyboard events
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+Z combination
    if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z' || e.keyCode === 90)) {
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

// Handle window resize
window.addEventListener('resize', () => {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCursorControl();
    if (cursorElement && cursorElement.parentNode) {
        cursorElement.parentNode.removeChild(cursorElement);
    }
});

console.log('Resume Assistant content script loaded. Press Ctrl+Shift+Z to toggle cursor control.');

