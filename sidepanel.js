// Side panel JavaScript for file upload and status display

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const clearButton = document.getElementById('clearButton');
const cursorStatus = document.getElementById('cursorStatus');

// Handle click on upload area
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

// Handle drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        handleFile(file);
    } else {
        alert('Please upload a PDF or DOCX file');
    }
});

// Handle file upload
function handleFile(file) {
    fileName.textContent = `📄 ${file.name}`;
    fileInfo.classList.add('show');
    clearButton.disabled = false;
    
    // Read file and store in chrome storage
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            name: file.name,
            type: file.type,
            data: e.target.result,
            uploadedAt: new Date().toISOString()
        };
        
        chrome.storage.local.set({ resumeFile: fileData }, () => {
            console.log('Resume saved to storage');
        });
    };
    reader.readAsDataURL(file);
}

// Clear button handler
clearButton.addEventListener('click', () => {
    fileInput.value = '';
    fileInfo.classList.remove('show');
    clearButton.disabled = true;
    
    chrome.storage.local.remove('resumeFile', () => {
        console.log('Resume cleared from storage');
    });
});

// Listen for status updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'cursorStatusUpdate') {
        updateCursorStatus(message.isActive);
    }
});

// Update cursor status display
function updateCursorStatus(isActive) {
    if (isActive) {
        cursorStatus.textContent = 'ON';
        cursorStatus.classList.remove('status-off');
        cursorStatus.classList.add('status-on');
    } else {
        cursorStatus.textContent = 'OFF';
        cursorStatus.classList.remove('status-on');
        cursorStatus.classList.add('status-off');
    }
}

// Check for stored resume on load
chrome.storage.local.get('resumeFile', (result) => {
    if (result.resumeFile) {
        fileName.textContent = `📄 ${result.resumeFile.name}`;
        fileInfo.classList.add('show');
        clearButton.disabled = false;
    }
});

// Query cursor control status from active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'getCursorStatus' }, (response) => {
            if (response && response.isActive !== undefined) {
                updateCursorStatus(response.isActive);
            }
        });
    }
});

