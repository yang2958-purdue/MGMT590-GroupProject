/**
 * API client for communicating with the FastAPI backend
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/api/health');
    return response.data;
  },

  // Resume endpoints
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  tailorResume: async (resumeId, jobId, resumeText, jobDescription, outputFormat = 'docx') => {
    const response = await apiClient.post('/api/resume/tailor', {
      resume_id: resumeId,
      job_id: jobId,
      resume_text: resumeText,
      job_description: jobDescription,
      output_format: outputFormat,
    });
    return response.data;
  },

  downloadTailoredResume: (tailoredId) => {
    return `${API_BASE_URL}/api/resume/download/${tailoredId}`;
  },

  // Job search endpoints
  searchJobs: async (companies, jobTitles, location = null, maxResults = 50) => {
    const response = await apiClient.post('/api/jobs/search', {
      companies,
      job_titles: jobTitles,
      location,
      max_results: maxResults,
    });
    return response.data;
  },

  scoreJobFit: async (resumeId, jobId, resumeText, jobDescription, useAi = false) => {
    const response = await apiClient.post('/api/jobs/score', {
      resume_id: resumeId,
      job_id: jobId,
      resume_text: resumeText,
      job_description: jobDescription,
      use_ai: useAi,
    });
    return response.data;
  },

  scoreBatch: async (resumeId, jobIds, useAi = false) => {
    const response = await apiClient.post('/api/jobs/score-batch', null, {
      params: { resume_id: resumeId, job_ids: jobIds, use_ai: useAi },
    });
    return response.data;
  },

  // Session endpoints
  getSessionItem: async (itemId) => {
    const response = await apiClient.get(`/api/session/${itemId}`);
    return response.data;
  },

  listSession: async () => {
    const response = await apiClient.get('/api/session');
    return response.data;
  },
};

export default apiClient;

