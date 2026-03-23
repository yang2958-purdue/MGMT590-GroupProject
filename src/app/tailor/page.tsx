'use client';

import { useState, useCallback, useEffect } from 'react';
import { StepGuard } from '@/components/layout/StepGuard';
import { TailoredResume } from '@/components/tailor/TailoredResume';
import { ExportButtons } from '@/components/tailor/ExportButtons';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function TailorPage() {
  const tailoredResult = useAppStore((s) => s.tailoredResult);
  const selectedPosting = useAppStore((s) => s.selectedPosting);
  const [text, setText] = useState(tailoredResult?.tailored_text ?? '');

  useEffect(() => {
    if (tailoredResult?.tailored_text) setText(tailoredResult.tailored_text);
  }, [tailoredResult?.tailored_text]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
  }, [text]);

  const handleSaveDocx = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const blob = await api.exportDocx(text);
      const path = await window.electronAPI.saveFile('docx');
      if (path) await window.electronAPI.writeFile(path, await blob.arrayBuffer());
    } catch {
      // ignore
    }
  }, [text]);

  const handleSaveTxt = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    const path = await window.electronAPI.saveFile('txt');
    if (path) await window.electronAPI.writeFile(path, text);
  }, [text]);

  if (!tailoredResult) return null;

  const title = selectedPosting?.title ?? 'Job';
  const company = selectedPosting?.company ?? 'Company';
  const improved = tailoredResult.ats_score_after > tailoredResult.ats_score_before;

  return (
    <StepGuard condition={!!tailoredResult} fallbackUrl="/posting">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Tailored for: {title} at {company}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          ATS Score: {Math.round(tailoredResult.ats_score_before)}% → {Math.round(tailoredResult.ats_score_after)}%
          {improved && <span className="text-green-600 ml-1">↑</span>}
        </p>
        <TailoredResume value={text} onChange={setText} />
        <div className="mt-4">
          <ExportButtons
            onCopy={handleCopy}
            onSaveDocx={handleSaveDocx}
            onSaveTxt={handleSaveTxt}
          />
        </div>
      </div>
    </StepGuard>
  );
}
