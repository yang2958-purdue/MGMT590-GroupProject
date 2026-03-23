'use client';

import { useState } from 'react';
import { TagInput } from './TagInput';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

export function SearchForm() {
  const titles = useAppStore((s) => s.searchConfig.titles);
  const companies = useAppStore((s) => s.searchConfig.companies);
  const location = useAppStore((s) => s.searchConfig.location);
  const setSearchConfig = useAppStore((s) => s.setSearchConfig);
  const setJobPostings = useAppStore((s) => s.setJobPostings);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const resume = useAppStore((s) => s.resume);
  const isLoading = useAppStore((s) => s.isLoading);

  const [remoteOnly, setRemoteOnly] = useState(false);
  const [loc, setLoc] = useState(location);

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    try {
      const postings = await api.searchJobs(
        {
          titles: titles.length ? titles : ['software engineer'],
          companies,
          location: remoteOnly ? 'Remote' : loc || 'Remote',
        },
        resume
      );
      setJobPostings(postings);
      setSearchConfig({ location: remoteOnly ? 'Remote' : loc });
      navigateTo('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <TagInput
        label="Job titles"
        value={titles}
        onChange={(v) => setSearchConfig({ titles: v })}
        placeholder="e.g. Software Engineer (press Enter to add)"
      />
      <TagInput
        label="Companies (optional)"
        value={companies}
        onChange={(v) => setSearchConfig({ companies: v })}
        placeholder="Company name (optional)"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          type="text"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          disabled={remoteOnly}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          placeholder="e.g. Remote, New York"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={remoteOnly}
          onChange={(e) => setRemoteOnly(e.target.checked)}
        />
        <span className="text-sm text-gray-700">Remote Only</span>
      </label>
      <button
        type="button"
        onClick={handleSearch}
        disabled={!resume || isLoading}
        className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isLoading ? 'Searching...' : 'Run Job Search'}
      </button>
    </div>
  );
}
