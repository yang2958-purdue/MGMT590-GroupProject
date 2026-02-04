import { useEffect, useState, FormEvent } from 'react';
import { Layout } from '../components/Layout/Layout';
import { api } from '../services/api';
import type { JobListing, Resume, MatchResult } from '../types';
import './Jobs.css';

export function Jobs() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, resumesData] = await Promise.all([
        api.listJobs(),
        api.listResumes(),
      ]);
      setJobs(jobsData);
      setResumes(resumesData.filter((r) => r.is_parsed));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportJob = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const jobData = {
      title: formData.get('title') as string,
      company: formData.get('company') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string || null,
      work_type: formData.get('work_type') as string || null,
      salary_range: formData.get('salary_range') as string || null,
      url: formData.get('url') as string || null,
    };

    try {
      const newJob = await api.importJob(jobData);
      setJobs([newJob, ...jobs]);
      setShowImportForm(false);
      alert('Job imported successfully!');
      e.currentTarget.reset();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to import job');
    }
  };

  const handleMatchJob = async (jobId: number) => {
    if (resumes.length === 0) {
      alert('Please upload and parse a resume first');
      return;
    }

    // Use first parsed resume
    const resumeId = resumes[0].id;

    try {
      const result = await api.matchResumeToJob(resumeId, jobId);
      setMatchResult(result);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to calculate match');
    }
  };

  const handleApply = async (jobId: number) => {
    if (resumes.length === 0) {
      alert('Please upload a resume first');
      return;
    }

    const resumeId = resumes[0].id;

    try {
      await api.createApplication({
        resume_id: resumeId,
        job_listing_id: jobId,
      });
      alert('Application created successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create application');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="jobs-loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="jobs-page">
        <div className="jobs-header">
          <h1>Job Listings</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowImportForm(!showImportForm)}
          >
            + Import Job
          </button>
        </div>

        {showImportForm && (
          <div className="import-form card mb-3">
            <div className="card-header">
              <h3>Import Job Listing</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleImportJob}>
                <div className="input-group">
                  <label className="input-label">Job Title *</label>
                  <input name="title" className="input" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Company *</label>
                  <input name="company" className="input" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Description *</label>
                  <textarea name="description" className="input textarea" required />
                </div>
                <div className="grid grid-cols-2">
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input name="location" className="input" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Work Type</label>
                    <select name="work_type" className="input">
                      <option value="">Select...</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Salary Range</label>
                  <input name="salary_range" className="input" placeholder="e.g., $80k-$120k" />
                </div>
                <div className="input-group">
                  <label className="input-label">Job URL</label>
                  <input name="url" type="url" className="input" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    Import Job
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowImportForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="jobs-content">
          <div className="jobs-list">
            {jobs.length === 0 ? (
              <div className="empty-state card">
                <div className="card-body text-center">
                  <h3>No jobs yet</h3>
                  <p className="text-secondary">Import your first job listing</p>
                </div>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`job-card card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="card-body">
                    <h3>{job.title}</h3>
                    <p className="text-secondary">{job.company}</p>
                    <div className="job-meta">
                      {job.location && <span>📍 {job.location}</span>}
                      {job.work_type && <span className="badge badge-info">{job.work_type}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedJob && (
            <div className="job-details card">
              <div className="card-header">
                <div>
                  <h2>{selectedJob.title}</h2>
                  <p className="text-secondary">{selectedJob.company}</p>
                </div>
                <div className="job-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleMatchJob(selectedJob.id)}
                  >
                    Calculate Match
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApply(selectedJob.id)}
                  >
                    Apply
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="job-info">
                  {selectedJob.location && <p><strong>Location:</strong> {selectedJob.location}</p>}
                  {selectedJob.work_type && <p><strong>Work Type:</strong> {selectedJob.work_type}</p>}
                  {selectedJob.salary_range && <p><strong>Salary:</strong> {selectedJob.salary_range}</p>}
                </div>

                {matchResult && matchResult.job_listing_id === selectedJob.id && (
                  <div className="match-result card">
                    <div className="card-body">
                      <h3>Match Score</h3>
                      <div className="match-score">
                        <div className="score-value">{matchResult.match_score.toFixed(1)}%</div>
                        <div className="score-label">{matchResult.explanation}</div>
                      </div>
                      {matchResult.matching_skills.length > 0 && (
                        <div className="match-section">
                          <h4>Matching Skills</h4>
                          <div className="skills-grid">
                            {matchResult.matching_skills.map((skill, idx) => (
                              <span key={idx} className="badge badge-success">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {matchResult.missing_skills.length > 0 && (
                        <div className="match-section">
                          <h4>Missing Skills</h4>
                          <div className="skills-grid">
                            {matchResult.missing_skills.map((skill, idx) => (
                              <span key={idx} className="badge badge-warning">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="job-description">
                  <h3>Job Description</h3>
                  <p>{selectedJob.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

