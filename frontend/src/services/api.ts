/**
 * API client for backend communication
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  Resume,
  JobListing,
  Application,
  ApplicationDetail,
  MatchResult,
  ApiError
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async register(data: RegisterData): Promise<User> {
    const response = await this.client.post<User>('/api/auth/register', data);
    return response.data;
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/api/auth/login', credentials);
    const tokens = response.data;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    return tokens;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/api/auth/me');
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Resumes
  async uploadResume(file: File): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<Resume>('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async listResumes(): Promise<Resume[]> {
    const response = await this.client.get<Resume[]>('/api/resumes/');
    return response.data;
  }

  async getResume(resumeId: number): Promise<Resume> {
    const response = await this.client.get<Resume>(`/api/resumes/${resumeId}`);
    return response.data;
  }

  async parseResume(resumeId: number): Promise<Resume> {
    const response = await this.client.post<Resume>(`/api/resumes/${resumeId}/parse`);
    return response.data;
  }

  async deleteResume(resumeId: number): Promise<void> {
    await this.client.delete(`/api/resumes/${resumeId}`);
  }

  // Jobs
  async importJob(jobData: Partial<JobListing>): Promise<JobListing> {
    const response = await this.client.post<JobListing>('/api/jobs/import', jobData);
    return response.data;
  }

  async listJobs(params?: {
    skip?: number;
    limit?: number;
    company?: string;
    location?: string;
    work_type?: string;
  }): Promise<JobListing[]> {
    const response = await this.client.get<JobListing[]>('/api/jobs/', { params });
    return response.data;
  }

  async getJob(jobId: number): Promise<JobListing> {
    const response = await this.client.get<JobListing>(`/api/jobs/${jobId}`);
    return response.data;
  }

  // Applications
  async createApplication(data: { resume_id: number; job_listing_id: number; notes?: string }): Promise<Application> {
    const response = await this.client.post<Application>('/api/applications/', data);
    return response.data;
  }

  async listApplications(): Promise<ApplicationDetail[]> {
    const response = await this.client.get<ApplicationDetail[]>('/api/applications/');
    return response.data;
  }

  async getApplication(applicationId: number): Promise<ApplicationDetail> {
    const response = await this.client.get<ApplicationDetail>(`/api/applications/${applicationId}`);
    return response.data;
  }

  async updateApplication(applicationId: number, data: { status?: string; notes?: string }): Promise<Application> {
    const response = await this.client.patch<Application>(`/api/applications/${applicationId}`, data);
    return response.data;
  }

  async deleteApplication(applicationId: number): Promise<void> {
    await this.client.delete(`/api/applications/${applicationId}`);
  }

  // Matching
  async matchResumeToJob(resumeId: number, jobListingId: number): Promise<MatchResult> {
    const response = await this.client.post<MatchResult>('/api/matching/match', {
      resume_id: resumeId,
      job_listing_id: jobListingId,
    });
    return response.data;
  }

  async tailorResume(resumeId: number, jobListingId: number): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.client.post('/api/matching/tailor-resume', {
      resume_id: resumeId,
      job_listing_id: jobListingId,
    });
    return response.data;
  }

  async generateCoverLetter(
    resumeId: number,
    jobListingId: number,
    companyInfo?: Record<string, any>
  ): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.client.post('/api/matching/generate-cover-letter', {
      resume_id: resumeId,
      job_listing_id: jobListingId,
      company_info: companyInfo,
    });
    return response.data;
  }
}

export const api = new ApiClient();

