import { create } from 'zustand';
import type {
  AppStep,
  ConfigStatus,
  ResumeData,
  ScoredJobPosting,
  SearchConfig,
  TailoredResult,
} from './types';

interface AppStore {
  backendReady: boolean;
  currentStep: AppStep;
  resume: ResumeData | null;
  searchConfig: SearchConfig;
  jobPostings: ScoredJobPosting[];
  selectedPosting: ScoredJobPosting | null;
  tailoredResult: TailoredResult | null;
  configStatus: ConfigStatus | null;
  isLoading: boolean;
  error: string | null;

  setBackendReady: (ready: boolean) => void;
  setResume: (resume: ResumeData) => void;
  setSearchConfig: (config: Partial<SearchConfig>) => void;
  setJobPostings: (postings: ScoredJobPosting[]) => void;
  setSelectedPosting: (posting: ScoredJobPosting | null) => void;
  setTailoredResult: (result: TailoredResult | null) => void;
  setConfigStatus: (status: ConfigStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  navigateTo: (step: AppStep) => void;
}

const defaultSearchConfig: SearchConfig = {
  titles: [],
  companies: [],
  location: 'Remote',
};

export const useAppStore = create<AppStore>((set) => ({
  backendReady: false,
  currentStep: 'resume',
  resume: null,
  searchConfig: defaultSearchConfig,
  jobPostings: [],
  selectedPosting: null,
  tailoredResult: null,
  configStatus: null,
  isLoading: false,
  error: null,

  setBackendReady: (ready) => set({ backendReady: ready }),
  setResume: (resume) => set({ resume }),
  setSearchConfig: (config) =>
    set((s) => ({ searchConfig: { ...s.searchConfig, ...config } })),
  setJobPostings: (postings) => set({ jobPostings: postings }),
  setSelectedPosting: (posting) => set({ selectedPosting: posting }),
  setTailoredResult: (result) => set({ tailoredResult: result }),
  setConfigStatus: (status) => set({ configStatus: status }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  navigateTo: (step) => set({ currentStep: step }),
}));
