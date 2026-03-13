// Resume Parser Module
// Extracts key information from resume text

var ResumeParser = (function() {
    'use strict';
    
    // Parsed resume data storage
    var resumeData = {
        personal: {
            firstName: '',
            lastName: '',
            fullName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        },
        education: [],
        experience: [],
        skills: [],
        summary: ''
    };
    
    // Clean text from PDF artifacts and formatting
    function cleanText(text) {
        // Remove PDF headers and metadata
        text = text.replace(/%PDF-[\d.]+/g, '');
        text = text.replace(/%%EOF/g, '');
        text = text.replace(/\/[A-Z][a-z]+\s*<<[^>]*>>/g, '');
        
        // Remove excessive whitespace and normalize
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/[\r\n]+/g, '\n');
        text = text.trim();
        
        // Remove non-printable characters except newlines
        text = text.replace(/[^\x20-\x7E\n]/g, '');
        
        return text;
    }
    
    // Validate email format
    function isValidEmail(email) {
        var emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        return emailRegex.test(email);
    }
    
    // Validate phone format
    function isValidPhone(phone) {
        // Phone should have at least 10 digits
        var digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }
    
    // Validate name format
    function isValidName(name) {
        // Name should have 2-4 words, each 2+ chars, only letters and spaces
        if (!name || name.length < 3 || name.length > 50) return false;
        var words = name.split(/\s+/);
        if (words.length < 2 || words.length > 4) return false;
        
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            if (word.length < 2) return false;
            if (!/^[A-Za-z'-]+$/.test(word)) return false;
        }
        return true;
    }
    
    // Extract email addresses with validation
    function extractEmail(text) {
        var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        var emails = text.match(emailRegex);
        
        if (emails) {
            for (var i = 0; i < emails.length; i++) {
                if (isValidEmail(emails[i])) {
                    return emails[i];
                }
            }
        }
        return '';
    }
    
    // Extract phone numbers with validation
    function extractPhone(text) {
        // Multiple phone formats
        var patterns = [
            /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,  // (123) 456-7890 or 123-456-7890
            /\+\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,  // +1-123-456-7890
            /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g  // 123-456-7890
        ];
        
        for (var p = 0; p < patterns.length; p++) {
            var phones = text.match(patterns[p]);
            if (phones) {
                for (var i = 0; i < phones.length; i++) {
                    var phone = phones[i].trim();
                    if (isValidPhone(phone)) {
                        return phone;
                    }
                }
            }
        }
        return '';
    }
    
    // Extract name from resume
    function extractName(text) {
        var lines = text.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line.length > 0; });
        
        console.log('📝 Analyzing lines for name extraction:', lines.slice(0, 10));
        
        // Try to find name in first 10 lines
        for (var i = 0; i < Math.min(10, lines.length); i++) {
            var line = lines[i].trim();
            
            // Skip lines with PDF artifacts, URLs, email, phone
            if (line.match(/%PDF|\/[A-Z]/i) || 
                line.match(/@/) || 
                line.match(/https?:\/\//) ||
                line.match(/\d{3}[-.)]\d{3}/)) {
                continue;
            }
            
            // Skip lines that are too long or too short
            if (line.length < 5 || line.length > 50) continue;
            
            // Check if line looks like a name
            if (isValidName(line)) {
                var words = line.split(/\s+/);
                
                // Must have proper capitalization
                var hasProperCaps = words.every(function(word) {
                    return word.length > 0 && word[0] === word[0].toUpperCase();
                });
                
                if (hasProperCaps) {
                    console.log('✅ Found valid name:', line);
                    return {
                        fullName: line,
                        firstName: words[0],
                        lastName: words[words.length - 1]
                    };
                }
            }
        }
        
        console.log('⚠️ No valid name found');
        return {
            fullName: '',
            firstName: '',
            lastName: ''
        };
    }
    
    // Extract address components
    function extractAddress(text) {
        var address = {
            full: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        };
        
        // ZIP code
        var zipRegex = /\b\d{5}(-\d{4})?\b/;
        var zipMatch = text.match(zipRegex);
        if (zipMatch) {
            address.zipCode = zipMatch[0];
        }
        
        // State abbreviations
        var stateRegex = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
        var stateMatch = text.match(stateRegex);
        if (stateMatch) {
            address.state = stateMatch[0];
        }
        
        return address;
    }
    
    // Extract education
    function extractEducation(text) {
        var education = [];
        var degreeKeywords = ['Bachelor', 'Master', 'PhD', 'B.S.', 'M.S.', 'B.A.', 'M.A.', 'Associate', 'Doctorate'];
        var lines = text.split('\n');
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            for (var j = 0; j < degreeKeywords.length; j++) {
                if (line.indexOf(degreeKeywords[j]) !== -1) {
                    education.push({
                        degree: line.trim(),
                        school: lines[i + 1] ? lines[i + 1].trim() : '',
                        year: extractYear(line)
                    });
                    break;
                }
            }
        }
        
        return education;
    }
    
    // Extract year from text
    function extractYear(text) {
        var yearRegex = /\b(19|20)\d{2}\b/g;
        var years = text.match(yearRegex);
        return years ? years[years.length - 1] : '';
    }
    
    // Extract skills
    function extractSkills(text) {
        var skills = [];
        var skillsSection = text.match(/SKILLS?[\s\S]*?(?=\n[A-Z]{2,}|\n\n|$)/i);
        
        if (skillsSection) {
            var skillText = skillsSection[0];
            // Common skills separators
            var skillList = skillText.split(/[,;•\n]/).map(function(s) { return s.trim(); }).filter(function(s) { 
                return s.length > 0 && s.toLowerCase() !== 'skills' && s.toLowerCase() !== 'skill';
            });
            skills = skillList;
        }
        
        return skills;
    }
    
    // Extract work experience
    function extractExperience(text) {
        var experience = [];
        var expSection = text.match(/EXPERIENCE[\s\S]*?(?=\n[A-Z]{2,}[A-Z\s]*\n|$)/i);
        
        if (expSection) {
            var expText = expSection[0];
            var lines = expText.split('\n');
            var currentJob = null;
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.length > 0) {
                    var year = extractYear(line);
                    if (year) {
                        if (currentJob) {
                            experience.push(currentJob);
                        }
                        currentJob = {
                            title: line,
                            company: '',
                            years: year,
                            description: ''
                        };
                    } else if (currentJob) {
                        if (!currentJob.company) {
                            currentJob.company = line;
                        } else {
                            currentJob.description += line + ' ';
                        }
                    }
                }
            }
            
            if (currentJob) {
                experience.push(currentJob);
            }
        }
        
        return experience;
    }
    
    // Main parsing function
    function parseResumeText(text) {
        console.log('📄 Parsing resume text (length: ' + text.length + ' chars)...');
        console.log('📝 First 200 chars:', text.substring(0, 200));
        
        // Clean the text first
        text = cleanText(text);
        console.log('🧹 After cleaning (first 200 chars):', text.substring(0, 200));
        
        // Extract personal information
        var nameData = extractName(text);
        resumeData.personal.fullName = nameData.fullName;
        resumeData.personal.firstName = nameData.firstName;
        resumeData.personal.lastName = nameData.lastName;
        
        var email = extractEmail(text);
        resumeData.personal.email = email;
        console.log('📧 Extracted email:', email);
        
        var phone = extractPhone(text);
        resumeData.personal.phone = phone;
        console.log('📞 Extracted phone:', phone);
        
        // Extract address
        var addressData = extractAddress(text);
        resumeData.personal.city = addressData.city;
        resumeData.personal.state = addressData.state;
        resumeData.personal.zipCode = addressData.zipCode;
        
        // Extract education
        resumeData.education = extractEducation(text);
        
        // Extract experience
        resumeData.experience = extractExperience(text);
        
        // Extract skills
        resumeData.skills = extractSkills(text);
        
        console.log('✅ Resume parsed successfully:', resumeData);
        return resumeData;
    }
    
    // Parse PDF file with improved text extraction
    function parsePDF(file, callback) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var arrayBuffer = e.target.result;
            var text = extractTextFromPDF(arrayBuffer);
            
            if (!text || text.length < 50) {
                console.error('⚠️ PDF text extraction failed or insufficient content');
                callback({
                    personal: {
                        firstName: '',
                        lastName: '',
                        fullName: '',
                        email: '',
                        phone: ''
                    },
                    education: [],
                    skills: [],
                    error: 'Could not extract text from PDF. Please use a text-based PDF or try a .txt file.'
                });
                return;
            }
            
            var data = parseResumeText(text);
            callback(data);
        };
        reader.readAsArrayBuffer(file);
    }
    
    // Enhanced PDF text extraction for real-world PDFs
    function extractTextFromPDF(arrayBuffer) {
        var uint8Array = new Uint8Array(arrayBuffer);
        var buffer = '';
        
        // Convert to string
        for (var i = 0; i < uint8Array.length; i++) {
            var char = String.fromCharCode(uint8Array[i]);
            buffer += char;
        }
        
        console.log('📄 PDF buffer size:', buffer.length);
        
        var extractedText = '';
        
        // Method 1: Extract text between parentheses (standard PDF text objects)
        var textInParentheses = buffer.match(/\(([^)]+)\)/g);
        if (textInParentheses && textInParentheses.length > 0) {
            console.log('📝 Method 1: Found ' + textInParentheses.length + ' text objects');
            for (var i = 0; i < textInParentheses.length; i++) {
                var text = textInParentheses[i].replace(/[()]/g, '');
                // Decode common PDF escape sequences
                text = text.replace(/\\n/g, '\n');
                text = text.replace(/\\r/g, '\n');
                text = text.replace(/\\t/g, ' ');
                text = text.replace(/\\\\/g, '\\');
                // Only keep printable characters
                text = text.replace(/[^\x20-\x7E\n]/g, ' ');
                if (text.trim().length > 0) {
                    extractedText += text + ' ';
                }
            }
        }
        
        // Method 2: Extract text between angle brackets (hex encoded text)
        var textInBrackets = buffer.match(/<([^>]+)>/g);
        if (textInBrackets && textInBrackets.length > 0) {
            console.log('📝 Method 2: Found ' + textInBrackets.length + ' hex-encoded text objects');
            for (var i = 0; i < textInBrackets.length; i++) {
                var hex = textInBrackets[i].replace(/[<>]/g, '');
                // Try to decode hex pairs
                if (hex.length > 2 && hex.length % 2 === 0) {
                    var decoded = '';
                    for (var j = 0; j < hex.length; j += 2) {
                        var byte = parseInt(hex.substr(j, 2), 16);
                        if (byte >= 32 && byte <= 126) {
                            decoded += String.fromCharCode(byte);
                        }
                    }
                    if (decoded.trim().length > 0) {
                        extractedText += decoded + ' ';
                    }
                }
            }
        }
        
        // Method 3: Extract text from stream objects
        var streamPattern = /stream\s+([\s\S]+?)\s+endstream/g;
        var streams = buffer.match(streamPattern);
        if (streams && streams.length > 0) {
            console.log('📝 Method 3: Found ' + streams.length + ' stream objects');
            for (var i = 0; i < streams.length; i++) {
                var streamContent = streams[i].replace(/stream\s+/, '').replace(/\s+endstream/, '');
                // Extract readable text from stream
                var readable = streamContent.match(/[A-Za-z0-9@.\-_\s,()]+/g);
                if (readable) {
                    for (var j = 0; j < readable.length; j++) {
                        var text = readable[j].trim();
                        if (text.length > 2) {
                            extractedText += text + ' ';
                        }
                    }
                }
            }
        }
        
        // Clean up extracted text
        extractedText = extractedText.replace(/\s+/g, ' ').trim();
        
        console.log('📝 Total extracted text length:', extractedText.length);
        console.log('📝 First 300 chars:', extractedText.substring(0, 300));
        
        // If we got very little text, try a more aggressive extraction
        if (extractedText.length < 100) {
            console.log('⚠️ Low extraction yield, trying aggressive method...');
            var aggressive = buffer.replace(/[^\x20-\x7E\n]/g, ' ');
            // Remove PDF commands and operators
            aggressive = aggressive.replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref)\b/g, '');
            aggressive = aggressive.replace(/\/[A-Za-z]+(\[[^\]]*\])?/g, '');
            aggressive = aggressive.replace(/\d+\s+\d+\s+obj/g, '');
            aggressive = aggressive.replace(/<<[^>]*>>/g, '');
            aggressive = aggressive.replace(/\s+/g, ' ').trim();
            
            if (aggressive.length > extractedText.length) {
                console.log('✅ Aggressive method found more text:', aggressive.length, 'chars');
                extractedText = aggressive;
            }
        }
        
        return extractedText;
    }
    
    // Parse DOCX file
    function parseDOCX(file, callback) {
        var reader = new FileReader();
        reader.onload = function(e) {
            // For MVP, basic text extraction
            // In production, would use mammoth.js library
            var text = e.target.result;
            var data = parseResumeText(text);
            callback(data);
        };
        reader.readAsText(file);
    }
    
    // Get resume data
    function getResumeData() {
        return resumeData;
    }
    
    // Clear resume data
    function clearResumeData() {
        resumeData = {
            personal: {
                firstName: '',
                lastName: '',
                fullName: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                country: ''
            },
            education: [],
            experience: [],
            skills: [],
            summary: ''
        };
    }
    
    // Public API
    return {
        parseResumeText: parseResumeText,
        parsePDF: parsePDF,
        parseDOCX: parseDOCX,
        getResumeData: getResumeData,
        clearResumeData: clearResumeData
    };
})();

// Make it available globally
window.ResumeParser = ResumeParser;

