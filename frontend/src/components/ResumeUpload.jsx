import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../api/client';

function ResumeUpload({ resume, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedResume, setParsedResume] = useState(resume);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const result = await api.uploadResume(file);
      setParsedResume(result);
      onUpload(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  return (
    <div>
      <h2 className="step-title">Upload Your Resume</h2>
      <p className="step-description">
        Upload your resume in PDF, DOCX, or TXT format. We'll parse it to extract your skills and experience.
      </p>

      {!parsedResume && (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="upload-icon">📄</div>
          {uploading ? (
            <div>
              <p style={{ fontWeight: 600 }}>Uploading and parsing...</p>
              <div className="spinner" style={{ margin: '1rem auto' }}></div>
            </div>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {isDragActive ? 'Drop your resume here' : 'Drag and drop your resume here'}
              </p>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                or click to browse (PDF, DOCX, TXT)
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {parsedResume && (
        <div className="skills-preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>✅ Resume Parsed Successfully</h3>
            <button
              onClick={() => {
                setParsedResume(null);
                onUpload(null);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Upload Different Resume
            </button>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <p><strong>Filename:</strong> {parsedResume.filename}</p>
            {parsedResume.experience_years && (
              <p><strong>Experience:</strong> ~{parsedResume.experience_years} years</p>
            )}
            
            {parsedResume.education && parsedResume.education.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Education:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  {parsedResume.education.map((edu, idx) => (
                    <li key={idx}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {parsedResume.skills && parsedResume.skills.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Detected Skills:</strong>
                <div className="skills-list">
                  {parsedResume.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;

