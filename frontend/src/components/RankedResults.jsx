import React, { useState } from 'react';

function RankedResults({ jobs, resume, onSelectJob, onBack }) {
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [sortBy, setSortBy] = useState('score'); // 'score' or 'recent'

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'score') {
      return b.fit_score - a.fit_score;
    } else {
      // Sort by date (most recent first)
      return new Date(b.date_posted || 0) - new Date(a.date_posted || 0);
    }
  });

  const toggleExpand = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#28a745';
    if (score >= 6) return '#ffc107';
    return '#dc3545';
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return 'Great Fit';
    if (score >= 6) return 'Good Fit';
    if (score >= 4) return 'Fair Fit';
    return 'Weak Fit';
  };

  return (
    <div>
      <h2 className="step-title">Job Search Results</h2>
      <p className="step-description">
        Found {jobs.length} jobs ranked by fit score. Click a job to see details and tailor your resume.
      </p>

      {jobs.length === 0 && (
        <div className="alert alert-warning">
          No jobs found. Please go back and try different search criteria.
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <strong>Sort by:</strong>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '2px solid #e9ecef',
                  fontSize: '0.9rem',
                }}
              >
                <option value="score">Best Fit</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>
              Top match: {sortedJobs[0]?.title} ({sortedJobs[0]?.fit_score?.toFixed(1)}/10)
            </div>
          </div>

          <div className="jobs-grid">
            {sortedJobs.map((job) => (
              <div
                key={job.job_id}
                className={`job-card ${expandedJobId === job.job_id ? 'expanded' : ''}`}
                onClick={() => toggleExpand(job.job_id)}
              >
                <div className="job-card-header">
                  <div style={{ flex: 1 }}>
                    <div className="job-title">{job.title}</div>
                    <div className="job-company">{job.company}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      className="fit-score"
                      style={{ background: getScoreColor(job.fit_score) }}
                    >
                      {job.fit_score?.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#666' }}>
                      {getScoreLabel(job.fit_score)}
                    </div>
                  </div>
                </div>

                {job.location && (
                  <div className="job-location">📍 {job.location}</div>
                )}

                {job.matching_skills && job.matching_skills.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#28a745' }}>
                      ✓ Matching Skills:
                    </strong>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      {job.matching_skills.slice(0, 5).join(', ')}
                      {job.matching_skills.length > 5 && ` +${job.matching_skills.length - 5} more`}
                    </div>
                  </div>
                )}

                {expandedJobId === job.job_id && (
                  <>
                    <div className="job-description" style={{ maxHeight: 'none', marginTop: '1rem' }}>
                      {job.description}
                    </div>

                    {job.missing_skills && job.missing_skills.length > 0 && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#856404' }}>
                          ⚠ Missing Skills:
                        </strong>
                        <div style={{ fontSize: '0.85rem', color: '#856404', marginTop: '0.25rem' }}>
                          {job.missing_skills.join(', ')}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectJob(job);
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        Tailor Resume for This Job →
                      </button>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        View Job ↗
                      </a>
                    </div>
                  </>
                )}

                {expandedJobId !== job.job_id && (
                  <div style={{ fontSize: '0.85rem', color: '#667eea', marginTop: '0.5rem' }}>
                    Click to see full details →
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="wizard-actions">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Search
        </button>
      </div>
    </div>
  );
}

export default RankedResults;

