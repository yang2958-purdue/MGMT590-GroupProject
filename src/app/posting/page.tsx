'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StepGuard } from '@/components/layout/StepGuard';
import { PostingHeader } from '@/components/posting/PostingHeader';
import { ScoreGauge } from '@/components/posting/ScoreGauge';
import { KeywordPanel } from '@/components/posting/KeywordPanel';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;
  const escaped = keywords
    .filter((k) => k.length > 0)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return text;
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-green-200">{part}</mark>
    ) : (
      part
    )
  );
}

export default function PostingPage() {
  const router = useRouter();
  const selectedPosting = useAppStore((s) => s.selectedPosting);
  const resume = useAppStore((s) => s.resume);
  const setTailoredResult = useAppStore((s) => s.setTailoredResult);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const configStatus = useAppStore((s) => s.configStatus);

  const hasAi = !!configStatus?.anthropic_api_key_set;

  const descriptionWithHighlights = useMemo(() => {
    if (!selectedPosting) return null;
    const matched = selectedPosting.matched_keywords || [];
    return highlightKeywords(selectedPosting.description, matched);
  }, [selectedPosting]);

  const handleTailor = useCallback(async () => {
    if (!resume || !selectedPosting) return;
    setError(null);
    setLoading(true);
    try {
      const result = await api.tailorResume(resume, selectedPosting);
      setTailoredResult(result);
      navigateTo('tailor');
      router.push('/tailor');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tailor failed');
    } finally {
      setLoading(false);
    }
  }, [resume, selectedPosting, setTailoredResult, setError, setLoading, navigateTo, router]);

  return (
    <StepGuard condition={!!selectedPosting} fallbackUrl="/results">
      {selectedPosting && (
        <div>
          <PostingHeader posting={selectedPosting} />
          <div className="flex gap-8 mb-6">
            <ScoreGauge
              value={selectedPosting.fit_score}
              max={10}
              label="Resume Fit"
            />
            <ScoreGauge
              value={selectedPosting.ats_score}
              max={100}
              label="ATS Match"
            />
          </div>
          <KeywordPanel
            matched={selectedPosting.matched_keywords || []}
            missing={selectedPosting.missing_keywords || []}
          />
          <div className="mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Job Description</h2>
            <div className="rounded border border-gray-200 bg-white p-4 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
              {descriptionWithHighlights}
            </div>
          </div>
          {hasAi ? (
            <button
              type="button"
              onClick={handleTailor}
              disabled={isLoading}
              className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isLoading ? 'Tailoring...' : 'Tailor My Resume'}
            </button>
          ) : (
            <p className="text-amber-700 text-sm">
              Configure an AI provider in Settings to use this feature.
            </p>
          )}
          {error && (
            <p className="mt-4 text-red-600 text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </StepGuard>
  );
}
