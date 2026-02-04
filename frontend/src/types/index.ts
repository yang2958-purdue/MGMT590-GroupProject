/**
 * TypeScript type definitions for the application
 */

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  preferences: Record<string, any>;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  file_path: string;
  is_parsed: number;
  parsed_data: ParsedResumeData;
  created_at: string;
}

export interface ParsedResumeData {
  skills: string[];
  work_experience: WorkExperience[];
  education: Education[];
  certifications: string[];
  projects: Project[];
  summary?: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
}

export interface Project {
  name: string;
  description: string;
}

export interface JobListing {
  id: number;
  title: string;
  company: string;
  description: string;
  location: string | null;
  salary_range: string | null;
  work_type: string | null;
  url: string | null;
  source: string | null;
  posted_date: string | null;
  parsed_requirements: JobRequirements;
  created_at: string;
}

export interface JobRequirements {
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  education_requirements: string[];
  responsibilities: string[];
}

export interface Application {
  id: number;
  user_id: number;
  resume_id: number;
  job_listing_id: number;
  status: string;
  match_score: number | null;
  applied_date: string;
  notes: string | null;
  tailored_resume_path: string | null;
  cover_letter_path: string | null;
}

export interface ApplicationDetail extends Application {
  resume: Resume;
  job_listing: JobListing;
}

export interface MatchResult {
  resume_id: number;
  job_listing_id: number;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: string;
}

export interface ApiError {
  detail: string;
}

