import type {
  Config,
  ConfigStatus,
  ResumeData,
  ScoredJobPosting,
  SearchConfig,
  TailoredResult,
} from './types';

const BASE = 'http://localhost:7823';

function getBase(): string {
  if (typeof window === 'undefined') return BASE;
  return BASE;
}

export const api = {
  async parseResume(file: File): Promise<ResumeData> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${getBase()}/api/resume/parse`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  },

  async searchJobs(
    config: SearchConfig,
    resume?: ResumeData | null
  ): Promise<ScoredJobPosting[]> {
    const res = await fetch(`${getBase()}/api/jobs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titles: config.titles,
        companies: config.companies,
        location: config.location,
        // Send resume explicitly so backend doesn't rely solely on global state.
        ...(resume ? { resume } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  },

  async tailorResume(
    resume: ResumeData,
    posting: ScoredJobPosting
  ): Promise<TailoredResult> {
    const res = await fetch(`${getBase()}/api/resume/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, posting }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  },

  async exportCsv(): Promise<Blob> {
    const res = await fetch(`${getBase()}/api/jobs/export-csv`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.blob();
  },

  async exportDocx(text: string): Promise<Blob> {
    const res = await fetch(`${getBase()}/api/resume/export-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.blob();
  },

  async getConfig(): Promise<ConfigStatus> {
    const res = await fetch(`${getBase()}/api/config`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  },

  async saveConfig(config: Partial<Config>): Promise<void> {
    const res = await fetch(`${getBase()}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
  },
};
