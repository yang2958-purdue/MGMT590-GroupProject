import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

function JobSearch({ companies, jobTitles, resume, onJobsFound, onBack }) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    setProgress('Searching for jobs...');

    try {
      // Search for jobs
      const result = await api.searchJobs(companies, jobTitles, null, 50);
      
      if (result.jobs.length === 0) {
        setError('No jobs found. Try different companies or job titles.');
        setSearching(false);
        return;
      }

      setProgress(`Found ${result.jobs.length} jobs! Calculating fit scores...`);

      // Score each job using TF-IDF (fast)
      const jobsWithScores = [];
      
      for (let i = 0; i < result.jobs.length; i++) {
        const job = result.jobs[i];
        
        try {
          const scoreResult = await api.scoreJobFit(
            resume.resume_id,
            job.job_id,
            resume.raw_text,
            job.description,
            false // use TF-IDF for speed
          );
          
          jobsWithScores.push({
            ...job,
            fit_score: scoreResult.score,
            matching_skills: scoreResult.matching_skills,
            missing_skills: scoreResult.missing_skills,
          });
          
          setProgress(`Scoring jobs... ${i + 1}/${result.jobs.length}`);
        } catch (err) {
          // If scoring fails, add job with default score
          jobsWithScores.push({ ...job, fit_score: 5.0 });
        }
      }

      // Sort by fit score
      jobsWithScores.sort((a, b) => b.fit_score - a.fit_score);

      onJobsFound(jobsWithScores);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to search for jobs');
      setSearching(false);
    }
  };

  // Auto-start search when component mounts
  useEffect(() => {
    if (!searching && companies.length > 0 && jobTitles.length > 0) {
      handleSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="step-title">Searching for Jobs</h2>
      <p className="step-description">
        We're searching for {jobTitles.join(', ')} positions at {companies.join(', ')} and analyzing fit scores.
      </p>

      {searching && (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            {progress}
          </p>
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            This may take a minute...
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-warning">
          <strong>Error:</strong> {error}
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleSearch} className="btn btn-primary">
              Retry Search
            </button>
          </div>
        </div>
      )}

      {!searching && (
        <div className="wizard-actions">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default JobSearch;

