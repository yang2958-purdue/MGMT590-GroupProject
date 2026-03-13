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
    
    // Extract email addresses
    function extractEmail(text) {
        var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        var emails = text.match(emailRegex);
        return emails ? emails[0] : '';
    }
    
    // Extract phone numbers
    function extractPhone(text) {
        var phoneRegex = /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;
        var phones = text.match(phoneRegex);
        return phones ? phones[0] : '';
    }
    
    // Extract name from resume
    function extractName(text) {
        var lines = text.split('\n');
        var firstLine = lines[0].trim();
        
        // Assuming name is usually in the first few lines
        // Look for lines with 2-4 words and proper capitalization
        for (var i = 0; i < Math.min(5, lines.length); i++) {
            var line = lines[i].trim();
            var words = line.split(/\s+/);
            
            // Name usually has 2-3 words, all capitalized
            if (words.length >= 2 && words.length <= 4) {
                var allCapitalized = words.every(function(word) {
                    return word.length > 0 && word[0] === word[0].toUpperCase();
                });
                
                if (allCapitalized && !line.match(/@/) && !line.match(/\d{3}/)) {
                    return {
                        fullName: line,
                        firstName: words[0],
                        lastName: words[words.length - 1]
                    };
                }
            }
        }
        
        // Fallback to first line
        var words = firstLine.split(/\s+/);
        return {
            fullName: firstLine,
            firstName: words[0] || '',
            lastName: words[words.length - 1] || ''
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
        console.log('📄 Parsing resume text...');
        
        // Extract personal information
        var nameData = extractName(text);
        resumeData.personal.fullName = nameData.fullName;
        resumeData.personal.firstName = nameData.firstName;
        resumeData.personal.lastName = nameData.lastName;
        resumeData.personal.email = extractEmail(text);
        resumeData.personal.phone = extractPhone(text);
        
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
    
    // Parse PDF file (simple text extraction)
    function parsePDF(file, callback) {
        var reader = new FileReader();
        reader.onload = function(e) {
            // For MVP, we'll extract visible text
            // In production, would use PDF.js library
            var arrayBuffer = e.target.result;
            var text = extractTextFromPDF(arrayBuffer);
            var data = parseResumeText(text);
            callback(data);
        };
        reader.readAsArrayBuffer(file);
    }
    
    // Simple PDF text extraction (basic implementation)
    function extractTextFromPDF(arrayBuffer) {
        var uint8Array = new Uint8Array(arrayBuffer);
        var text = '';
        
        // Convert to string and extract visible text between parentheses
        for (var i = 0; i < uint8Array.length; i++) {
            var char = String.fromCharCode(uint8Array[i]);
            if (char.match(/[\x20-\x7E]/)) { // Printable ASCII
                text += char;
            }
        }
        
        // Clean up PDF formatting
        text = text.replace(/\(/g, ' ').replace(/\)/g, ' ');
        text = text.replace(/\s+/g, ' ');
        
        return text;
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

