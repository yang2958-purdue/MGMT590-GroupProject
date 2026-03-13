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
    fileName.textContent = `📄 ${file.name} (Parsing...)`;
    fileInfo.classList.add('show');
    clearButton.disabled = false;
    
    // Read file and parse resume
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            name: file.name,
            type: file.type,
            data: e.target.result,
            uploadedAt: new Date().toISOString()
        };
        
        // Parse resume based on file type
        parseResume(file, fileData);
    };
    reader.readAsDataURL(file);
}

// Parse resume and extract data
function parseResume(file, fileData) {
    // Read file as text for parsing
    const textReader = new FileReader();
    textReader.onload = function(e) {
        const text = e.target.result;
        
        // Parse resume text
        const resumeData = parseResumeTextSimple(text);
        
        // Store both file data and parsed resume data
        chrome.storage.local.set({ 
            resumeFile: fileData,
            resumeData: resumeData
        }, () => {
            console.log('Resume saved and parsed:', resumeData);
            fileName.textContent = `📄 ${file.name} ✅`;
            
            // Show parsed data
            displayParsedData(resumeData);
            
            // Send to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'resumeDataParsed',
                        data: resumeData
                    });
                }
            });
        });
    };
    textReader.readAsText(file);
}

// Enhanced resume parser for sidepanel
function parseResumeTextSimple(text) {
    console.log('📄 Parsing resume in sidepanel (length: ' + text.length + ')');
    console.log('📝 First 200 chars:', text.substring(0, 200));
    
    const data = {
        personal: {
            firstName: '',
            lastName: '',
            fullName: '',
            email: '',
            phone: ''
        },
        education: [],
        skills: []
    };
    
    // Clean text from PDF artifacts
    text = text.replace(/%PDF-[\d.]+/g, '');
    text = text.replace(/%%EOF/g, '');
    text = text.replace(/\/[A-Z][a-z]+\s*<<[^>]*>>/g, '');
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/[^\x20-\x7E\n]/g, ' ');
    text = text.trim();
    
    // Extract email with validation
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) {
        for (let i = 0; i < emails.length; i++) {
            if (emails[i].length > 5 && emails[i].includes('.')) {
                data.personal.email = emails[i];
                console.log('✅ Found email:', emails[i]);
                break;
            }
        }
    }
    
    // Extract phone with validation
    const phonePatterns = [
        /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        /\+\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    ];
    
    for (let p = 0; p < phonePatterns.length; p++) {
        const phones = text.match(phonePatterns[p]);
        if (phones) {
            for (let i = 0; i < phones.length; i++) {
                const phone = phones[i].trim();
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 10 && digits.length <= 15) {
                    data.personal.phone = phone;
                    console.log('✅ Found phone:', phone);
                    break;
                }
            }
            if (data.personal.phone) break;
        }
    }
    
    // Extract name - look for valid name in first 10 lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log('📝 Lines to check:', lines.slice(0, 10));
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        
        // Skip lines with artifacts, email, phone, or URLs
        if (line.match(/%PDF|\/[A-Z]/i) || 
            line.match(/@/) || 
            line.match(/https?:\/\//) ||
            line.match(/\d{3}[-.)]\d{3}/)) {
            continue;
        }
        
        // Check if looks like a name (2-4 words, 5-50 chars, letters only)
        if (line.length >= 5 && line.length <= 50) {
            const words = line.split(/\s+/);
            
            if (words.length >= 2 && words.length <= 4) {
                const allWords = words.every(word => 
                    word.length >= 2 && /^[A-Za-z'-]+$/.test(word)
                );
                
                const hasProperCaps = words.every(word => 
                    word[0] === word[0].toUpperCase()
                );
                
                if (allWords && hasProperCaps) {
                    data.personal.fullName = line;
                    data.personal.firstName = words[0];
                    data.personal.lastName = words[words.length - 1];
                    console.log('✅ Found name:', line);
                    break;
                }
            }
        }
    }
    
    console.log('✅ Parsed data:', data);
    return data;
}

// Display parsed resume data
function displayParsedData(data) {
    // Create or update parsed data display
    let parsedSection = document.getElementById('parsedDataSection');
    if (!parsedSection) {
        parsedSection = document.createElement('div');
        parsedSection.id = 'parsedDataSection';
        parsedSection.style.cssText = 'margin-top: 10px; padding: 10px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; font-size: 12px;';
        fileInfo.appendChild(parsedSection);
    }
    
    let html = '<strong style="color: #0369a1;">📋 Extracted Data:</strong><br>';
    let hasData = false;
    
    if (data.error) {
        html += '<div style="color: #dc2626; margin-top: 5px;">⚠️ ' + data.error + '</div>';
    }
    
    if (data.personal.fullName) {
        html += '<div>👤 Name: ' + data.personal.fullName + '</div>';
        hasData = true;
    }
    if (data.personal.email) {
        html += '<div>📧 Email: ' + data.personal.email + '</div>';
        hasData = true;
    }
    if (data.personal.phone) {
        html += '<div>📞 Phone: ' + data.personal.phone + '</div>';
        hasData = true;
    }
    
    if (!hasData && !data.error) {
        html += '<div style="color: #ea580c; margin-top: 5px;">⚠️ No data extracted. Try using a .txt file or check the console for details.</div>';
    }
    
    parsedSection.innerHTML = html;
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
    } else if (message.type === 'keyPressDebug') {
        updateLastKeyPress(message.keyInfo);
    } else if (message.type === 'fieldCountUpdate') {
        updateFieldCount(message.count, message.fields);
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

// Update last key press display
function updateLastKeyPress(keyInfo) {
    const lastKeyPress = document.getElementById('lastKeyPress');
    if (lastKeyPress) {
        const keyCombo = [];
        if (keyInfo.ctrlKey) keyCombo.push('Ctrl');
        if (keyInfo.shiftKey) keyCombo.push('Shift');
        if (keyInfo.altKey) keyCombo.push('Alt');
        keyCombo.push(keyInfo.key);
        
        lastKeyPress.textContent = keyCombo.join('+');
        lastKeyPress.style.background = '#e3f2fd';
        lastKeyPress.style.color = '#1565c0';
        
        // Highlight briefly if it's the correct combination
        if (keyInfo.ctrlKey && keyInfo.shiftKey && (keyInfo.key === 'Z' || keyInfo.key === 'z')) {
            lastKeyPress.style.background = '#e8f5e9';
            lastKeyPress.style.color = '#2e7d32';
            lastKeyPress.textContent = '✅ Ctrl+Shift+Z';
        }
    }
}

// Update field count display
function updateFieldCount(count, fields) {
    const fieldCountEl = document.getElementById('fieldCount');
    const fieldBreakdownEl = document.getElementById('fieldBreakdown');
    
    if (fieldCountEl) {
        fieldCountEl.textContent = count;
        
        // Update color based on count
        if (count > 0) {
            fieldCountEl.style.background = '#e8f5e9';
            fieldCountEl.style.color = '#2e7d32';
        } else {
            fieldCountEl.style.background = '#ffebee';
            fieldCountEl.style.color = '#c62828';
        }
    }
    
    // Show breakdown if fields exist
    if (fieldBreakdownEl && fields && fields.length > 0) {
        fieldBreakdownEl.style.display = 'block';
        
        // Count by type
        let textCount = 0;
        let dropdownCount = 0;
        let choiceCount = 0;
        let filledCount = 0;
        
        fields.forEach(field => {
            if (field.type === 'text' || field.type === 'textarea') textCount++;
            else if (field.type === 'dropdown') dropdownCount++;
            else if (field.type === 'radio' || field.type === 'checkbox') choiceCount++;
            
            if (field.filled) filledCount++;
        });
        
        document.getElementById('textFieldCount').textContent = textCount;
        document.getElementById('dropdownCount').textContent = dropdownCount;
        document.getElementById('choiceCount').textContent = choiceCount;
        document.getElementById('filledCount').textContent = filledCount;
    } else if (fieldBreakdownEl) {
        fieldBreakdownEl.style.display = 'none';
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
            // Handle response if available
            if (chrome.runtime.lastError) {
                // Content script may not be ready yet, that's OK
                console.log('Waiting for content script to load...');
            } else if (response && response.isActive !== undefined) {
                updateCursorStatus(response.isActive);
            }
        });
    }
});

