'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JobTable } from '@/components/results/JobTable';
import { useAppStore } from '@/lib/store';

export default function ResultsPage() {
  const router = useRouter();
  const jobPostings = useAppStore((s) => s.jobPostings);
  const setSelectedPosting = useAppStore((s) => s.setSelectedPosting);
  const setError = useAppStore((s) => s.setError);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const handleSelect = useCallback(
    (p: (typeof jobPostings)[0]) => {
      setSelectedPosting(p);
      navigateTo('posting');
      router.push('/posting');
    },
    [setSelectedPosting, navigateTo, router]
  );

  const handleExportCsv = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const { api } = await import('@/lib/api');
      const blob = await api.exportCsv();
      const path = await window.electronAPI.saveFile('csv');
      if (path) await window.electronAPI.writeFile(path, await blob.arrayBuffer());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  }, [setError]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Results</h1>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={jobPostings.length === 0}
          className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>
      <JobTable postings={jobPostings} onSelect={handleSelect} />
    </div>
  );
}
