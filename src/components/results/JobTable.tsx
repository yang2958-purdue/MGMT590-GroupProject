'use client';

import { useState, useMemo } from 'react';
import type { ScoredJobPosting } from '@/lib/types';
import { ScoreBadge } from './ScoreBadge';

type SortKey = 'fit_score' | 'ats_score' | 'title' | 'company' | 'location' | 'date_posted';

export function JobTable({
  postings,
  onSelect,
}: {
  postings: ScoredJobPosting[];
  onSelect: (p: ScoredJobPosting) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('fit_score');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...postings];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return asc ? aVal - bVal : bVal - aVal;
      const sa = String(aVal ?? '');
      const sb = String(bVal ?? '');
      return asc ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return arr;
  }, [postings, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(key === 'title' || key === 'company' || key === 'location' || key === 'date_posted');
    }
  };

  if (postings.length === 0) {
    return (
      <p className="text-gray-600 py-8">No results. Run a job search from the Search step.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggle('fit_score')}
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                Fit Score {sortKey === 'fit_score' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggle('ats_score')}
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                ATS Score {sortKey === 'ats_score' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                type="button"
                onClick={() => toggle('title')}
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                Title {sortKey === 'title' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggle('company')} className="font-medium text-gray-700 hover:text-gray-900">
                Company {sortKey === 'company' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggle('location')} className="font-medium text-gray-700 hover:text-gray-900">
                Location {sortKey === 'location' && (asc ? '↑' : '↓')}
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button type="button" onClick={() => toggle('date_posted')} className="font-medium text-gray-700 hover:text-gray-900">
                Date {sortKey === 'date_posted' && (asc ? '↑' : '↓')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((p) => (
            <tr
              key={p.url}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(p)}
            >
              <td className="px-4 py-2">
                <ScoreBadge value={p.fit_score} type="fit" />
              </td>
              <td className="px-4 py-2">
                <ScoreBadge value={p.ats_score} type="ats" />
              </td>
              <td className="px-4 py-2 text-sm">{p.title}</td>
              <td className="px-4 py-2 text-sm">{p.company}</td>
              <td className="px-4 py-2 text-sm">{p.location}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{p.date_posted || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
