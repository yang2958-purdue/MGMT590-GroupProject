import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { api } from '../services/api';
import type { Resume, Application } from '../types';
import './Dashboard.css';

export function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resumesData, applicationsData] = await Promise.all([
        api.listResumes(),
        api.listApplications(),
      ]);
      setResumes(resumesData);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  const stats = {
    resumes: resumes.length,
    parsedResumes: resumes.filter((r) => r.is_parsed).length,
    applications: applications.length,
    pending: applications.filter((a) => a.status === 'Pending').length,
    interviewing: applications.filter((a) => a.status === 'Interviewing').length,
  };

  return (
    <Layout>
      <div className="dashboard">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle text-secondary">
          Welcome back! Here's your job search overview.
        </p>

        <div className="dashboard-stats">
          <div className="stat-card card">
            <div className="card-body">
              <div className="stat-value">{stats.resumes}</div>
              <div className="stat-label">Resumes</div>
              <div className="stat-detail text-sm text-secondary">
                {stats.parsedResumes} parsed
              </div>
            </div>
          </div>

          <div className="stat-card card">
            <div className="card-body">
              <div className="stat-value">{stats.applications}</div>
              <div className="stat-label">Applications</div>
              <div className="stat-detail text-sm text-secondary">
                {stats.pending} pending
              </div>
            </div>
          </div>

          <div className="stat-card card">
            <div className="card-body">
              <div className="stat-value">{stats.interviewing}</div>
              <div className="stat-label">Interviewing</div>
              <div className="stat-detail text-sm text-secondary">
                Active interviews
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <h2 className="dashboard-section-title">Quick Actions</h2>
          <div className="action-grid">
            <Link to="/resumes" className="action-card card">
              <div className="card-body">
                <h3>📄 Upload Resume</h3>
                <p className="text-secondary text-sm">
                  Upload and parse your resume to get started
                </p>
              </div>
            </Link>

            <Link to="/jobs" className="action-card card">
              <div className="card-body">
                <h3>🔍 Search Jobs</h3>
                <p className="text-secondary text-sm">
                  Find and import job listings
                </p>
              </div>
            </Link>

            <Link to="/applications" className="action-card card">
              <div className="card-body">
                <h3>📊 Track Applications</h3>
                <p className="text-secondary text-sm">
                  Manage your job applications
                </p>
              </div>
            </Link>
          </div>
        </div>

        {applications.length > 0 && (
          <div className="dashboard-recent">
            <h2 className="dashboard-section-title">Recent Applications</h2>
            <div className="card">
              <div className="card-body">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="recent-application">
                    <div>
                      <div className="recent-app-title">Application #{app.id}</div>
                      <div className="text-sm text-secondary">
                        {new Date(app.applied_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge badge-${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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

