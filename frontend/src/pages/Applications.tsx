import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { api } from '../services/api';
import type { ApplicationDetail } from '../types';
import './Applications.css';

export function Applications() {
  const [applications, setApplications] = useState<ApplicationDetail[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await api.listApplications();
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    setUpdating(true);
    try {
      const updated = await api.updateApplication(appId, { status: newStatus });
      setApplications(
        applications.map((app) =>
          app.id === appId ? { ...app, status: updated.status } : app
        )
      );
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, status: updated.status });
      }
      alert('Status updated successfully!');
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateNotes = async (appId: number, notes: string) => {
    setUpdating(true);
    try {
      const updated = await api.updateApplication(appId, { notes });
      setApplications(
        applications.map((app) =>
          app.id === appId ? { ...app, notes: updated.notes } : app
        )
      );
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, notes: updated.notes });
      }
      alert('Notes updated successfully!');
    } catch (error) {
      alert('Failed to update notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteApplication = async (appId: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await api.deleteApplication(appId);
      setApplications(applications.filter((app) => app.id !== appId));
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
      alert('Application deleted successfully!');
    } catch (error) {
      alert('Failed to delete application');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="applications-loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="applications-page">
        <div className="applications-header">
          <h1>My Applications</h1>
          <div className="applications-stats">
            <span className="stat-item">
              Total: <strong>{applications.length}</strong>
            </span>
            <span className="stat-item">
              Pending: <strong>{applications.filter((a) => a.status === 'Pending').length}</strong>
            </span>
            <span className="stat-item">
              Interviewing:{' '}
              <strong>{applications.filter((a) => a.status === 'Interviewing').length}</strong>
            </span>
          </div>
        </div>

        <div className="applications-content">
          <div className="applications-list">
            {applications.length === 0 ? (
              <div className="empty-state card">
                <div className="card-body text-center">
                  <h3>No applications yet</h3>
                  <p className="text-secondary">Apply to jobs to track them here</p>
                </div>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className={`application-card card ${selectedApp?.id === app.id ? 'selected' : ''}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="card-body">
                    <div className="app-card-header">
                      <h3>{app.job_listing.title}</h3>
                      <span className={`badge badge-${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-secondary">{app.job_listing.company}</p>
                    <div className="app-card-meta">
                      <span className="text-sm text-secondary">
                        Applied: {new Date(app.applied_date).toLocaleDateString()}
                      </span>
                      {app.match_score && (
                        <span className="match-badge">
                          Match: {app.match_score.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedApp && (
            <div className="application-details card">
              <div className="card-header">
                <div>
                  <h2>{selectedApp.job_listing.title}</h2>
                  <p className="text-secondary">{selectedApp.job_listing.company}</p>
                </div>
              </div>
              <div className="card-body">
                <div className="app-info-grid">
                  <div>
                    <label className="info-label">Status</label>
                    <select
                      className="input"
                      value={selectedApp.status}
                      onChange={(e) => handleUpdateStatus(selectedApp.id, e.target.value)}
                      disabled={updating}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="info-label">Applied Date</label>
                    <div className="info-value">
                      {new Date(selectedApp.applied_date).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedApp.match_score && (
                    <div>
                      <label className="info-label">Match Score</label>
                      <div className="info-value">{selectedApp.match_score.toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                <div className="app-section">
                  <label className="info-label">Notes</label>
                  <textarea
                    className="input textarea"
                    value={selectedApp.notes || ''}
                    onChange={(e) => {
                      setSelectedApp({ ...selectedApp, notes: e.target.value });
                    }}
                    onBlur={(e) => handleUpdateNotes(selectedApp.id, e.target.value)}
                    placeholder="Add your notes here..."
                    disabled={updating}
                  />
                </div>

                <div className="app-section">
                  <h3>Resume Used</h3>
                  <div className="info-value">{selectedApp.resume.filename}</div>
                </div>

                <div className="app-section">
                  <h3>Job Details</h3>
                  <div className="job-details-grid">
                    {selectedApp.job_listing.location && (
                      <div>
                        <strong>Location:</strong> {selectedApp.job_listing.location}
                      </div>
                    )}
                    {selectedApp.job_listing.work_type && (
                      <div>
                        <strong>Work Type:</strong> {selectedApp.job_listing.work_type}
                      </div>
                    )}
                    {selectedApp.job_listing.salary_range && (
                      <div>
                        <strong>Salary:</strong> {selectedApp.job_listing.salary_range}
                      </div>
                    )}
                  </div>
                  {selectedApp.job_listing.url && (
                    <a
                      href={selectedApp.job_listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm mt-2"
                    >
                      View Job Posting
                    </a>
                  )}
                </div>

                <div className="app-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteApplication(selectedApp.id)}
                  >
                    Delete Application
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Submitted':
      return 'info';
    case 'Interviewing':
      return 'primary';
    case 'Offer':
      return 'success';
    case 'Rejected':
      return 'danger';
    default:
      return 'info';
  }
}

