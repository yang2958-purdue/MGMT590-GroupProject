import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

function ResumeTailor({ resume, job, onComplete, onBack, onStartOver }) {
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [error, setError] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    // Auto-start tailoring when component mounts
    if (!tailoring && !tailoredResume && resume && job) {
      handleTailor();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTailor = async () => {
    setTailoring(true);
    setError(null);

    try {
      const result = await api.tailorResume(
        resume.resume_id,
        job.job_id,
        resume.raw_text,
        job.description,
        'docx'
      );

      setTailoredResume(result);
      onComplete(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to tailor resume. Make sure Claude API key is configured.');
    } finally {
      setTailoring(false);
    }
  };

  const downloadUrl = tailoredResume ? api.downloadTailoredResume(tailoredResume.tailored_resume_id) : null;

  return (
    <div>
      <h2 className="step-title">Tailored Resume</h2>
      <p className="step-description">
        AI is customizing your resume for: <strong>{job?.title}</strong> at <strong>{job?.company}</strong>
      </p>

      {tailoring && (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            Tailoring your resume with AI...
          </p>
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            This may take 10-20 seconds
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-warning">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleTailor} className="btn btn-primary">
              Retry Tailoring
            </button>
          </div>
        </div>
      )}

      {tailoredResume && !tailoring && (
        <>
          <div className="alert alert-success">
            <strong>✅ Resume Tailored Successfully!</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Your resume has been optimized for this specific role.
            </p>
          </div>

          {tailoredResume.changes_made && tailoredResume.changes_made.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem' }}>🔧 Key Changes Made:</h4>
              <ul style={{ marginLeft: '1.5rem', lineHeight: 1.8 }}>
                {tailoredResume.changes_made.map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              {showComparison ? 'Hide' : 'Show'} Comparison
            </button>
            <a
              href={downloadUrl}
              download
              className="btn btn-primary"
              style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              📥 Download Tailored Resume (.docx)
            </a>
          </div>

          {showComparison && (
            <div className="resume-comparison">
              <div className="resume-column">
                <h3>Original Resume</h3>
                <div className="resume-text">
                  {resume.raw_text.substring(0, 1500)}
                  {resume.raw_text.length > 1500 && '...'}
                </div>
              </div>
              <div className="resume-column" style={{ background: '#f0f9ff', borderColor: '#667eea' }}>
                <h3>✨ Tailored Resume</h3>
                <div className="resume-text">
                  {tailoredResume.tailored_text.substring(0, 1500)}
                  {tailoredResume.tailored_text.length > 1500 && '...'}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#e8f4f8', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '1rem' }}>🎯 Next Steps:</h4>
            <ol style={{ marginLeft: '1.5rem', lineHeight: 2 }}>
              <li>Download your tailored resume</li>
              <li>Review and make any final personal adjustments</li>
              <li>Apply to the job: <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>{job.title} at {job.company}</a></li>
              <li>Repeat for other top-ranked jobs!</li>
            </ol>
          </div>
        </>
      )}

      <div className="wizard-actions">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Results
        </button>
        <button onClick={onStartOver} className="btn btn-primary">
          🔄 Start New Search
        </button>
      </div>
    </div>
  );
}

export default ResumeTailor;

