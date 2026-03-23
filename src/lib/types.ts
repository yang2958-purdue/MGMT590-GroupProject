export interface ResumeData {
  raw_text: string;
  skills: string[];
  experience: string[];
  education: string[];
  filename: string;
}

export interface JobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  date_posted: string;
}

export interface ScoredJobPosting extends JobPosting {
  fit_score: number;
  ats_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface TailoredResult {
  tailored_text: string;
  ats_score_before: number;
  ats_score_after: number;
}

export type AppStep = 'resume' | 'search' | 'results' | 'posting' | 'tailor';

export interface SearchConfig {
  titles: string[];
  companies: string[];
  location: string;
}

export interface ConfigStatus {
  anthropic_api_key_set?: boolean;
  openai_api_key_set?: boolean;
  serp_api_key_set?: boolean;
  default_location?: string;
}

export interface Config {
  anthropic_api_key?: string;
  openai_api_key?: string;
  serp_api_key?: string;
  scraper?: string;
  ai_provider?: string;
  default_location?: string;
}
