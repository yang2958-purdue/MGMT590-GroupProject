import { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout/Layout';
import { api } from '../services/api';
import type { Resume } from '../types';
import './Resumes.css';

export function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const data = await api.listResumes();
      setResumes(data);
    } catch (error) {
      console.error('Failed to load resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const resume = await api.uploadResume(file);
      setResumes([resume, ...resumes]);
      alert('Resume uploaded successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleParseResume = async (resumeId: number) => {
    setParsing(true);
    try {
      const updatedResume = await api.parseResume(resumeId);
      setResumes(resumes.map((r) => (r.id === resumeId ? updatedResume : r)));
      setSelectedResume(updatedResume);
      alert('Resume parsed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await api.deleteResume(resumeId);
      setResumes(resumes.filter((r) => r.id !== resumeId));
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
      }
      alert('Resume deleted successfully!');
    } catch (error) {
      alert('Failed to delete resume');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="resumes-loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="resumes-page">
        <div className="resumes-header">
          <h1>My Resumes</h1>
          <div className="resumes-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : '+ Upload Resume'}
            </button>
          </div>
        </div>

        <div className="resumes-content">
          <div className="resumes-list">
            {resumes.length === 0 ? (
              <div className="empty-state card">
                <div className="card-body text-center">
                  <h3>No resumes yet</h3>
                  <p className="text-secondary">Upload your first resume to get started</p>
                </div>
              </div>
            ) : (
              resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`resume-card card ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                  onClick={() => setSelectedResume(resume)}
                >
                  <div className="card-body">
                    <div className="resume-card-header">
                      <h3>{resume.filename}</h3>
                      {resume.is_parsed ? (
                        <span className="badge badge-success">Parsed</span>
                      ) : (
                        <span className="badge badge-warning">Not Parsed</span>
                      )}
                    </div>
                    <p className="text-sm text-secondary">
                      Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                    {resume.is_parsed && resume.parsed_data.skills && (
                      <div className="resume-skills">
                        <span className="text-sm">Skills: </span>
                        {resume.parsed_data.skills.slice(0, 3).join(', ')}
                        {resume.parsed_data.skills.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedResume && (
            <div className="resume-details card">
              <div className="card-header">
                <h2>{selectedResume.filename}</h2>
                <div className="resume-actions">
                  {!selectedResume.is_parsed && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleParseResume(selectedResume.id)}
                      disabled={parsing}
                    >
                      {parsing ? 'Parsing...' : 'Parse Resume'}
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteResume(selectedResume.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="card-body">
                {selectedResume.is_parsed ? (
                  <div className="resume-parsed-data">
                    {selectedResume.parsed_data.summary && (
                      <div className="resume-section">
                        <h3>Summary</h3>
                        <p>{selectedResume.parsed_data.summary}</p>
                      </div>
                    )}

                    {selectedResume.parsed_data.skills?.length > 0 && (
                      <div className="resume-section">
                        <h3>Skills</h3>
                        <div className="skills-grid">
                          {selectedResume.parsed_data.skills.map((skill, idx) => (
                            <span key={idx} className="badge badge-primary">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedResume.parsed_data.work_experience?.length > 0 && (
                      <div className="resume-section">
                        <h3>Work Experience</h3>
                        {selectedResume.parsed_data.work_experience.map((exp, idx) => (
                          <div key={idx} className="experience-item">
                            <h4>{exp.role} - {exp.company}</h4>
                            <p className="text-sm text-secondary">{exp.duration}</p>
                            <p>{exp.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedResume.parsed_data.education?.length > 0 && (
                      <div className="resume-section">
                        <h3>Education</h3>
                        {selectedResume.parsed_data.education.map((edu, idx) => (
                          <div key={idx} className="education-item">
                            <h4>{edu.degree}</h4>
                            <p className="text-sm text-secondary">
                              {edu.institution} - {edu.year}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-secondary">
                    <p>Resume not parsed yet. Click "Parse Resume" to extract data.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

