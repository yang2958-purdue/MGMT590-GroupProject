'use client';

import { useState, useCallback } from 'react';
import { ResumeDropzone } from '@/components/resume/ResumeDropzone';
import { SkillsPreview } from '@/components/resume/SkillsPreview';
import { useAppStore } from '@/lib/store';

export default function ResumePage() {
  const [dragging, setDragging] = useState(false);
  const setResume = useAppStore((s) => s.setResume);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);
  const resume = useAppStore((s) => s.resume);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);

  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;
      const { api } = await import('@/lib/api');
      setError(null);
      setLoading(true);
      try {
        const data = await api.parseResume(file);
        setResume(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse resume');
      } finally {
        setLoading(false);
      }
    },
    [setResume, setError, setLoading]
  );

  const handleBrowse = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.openFile) return;
    const path = await window.electronAPI.openFile();
    if (!path) return;
    const ab = await window.electronAPI.readFile(path);
    const name = path.replace(/^.*[\\/]/, '') || 'resume.pdf';
    const file = new File([ab], name);
    await processFile(file);
  }, [processFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f && /\.(pdf|docx?|txt)$/i.test(f.name)) processFile(f);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Upload Resume</h1>
      {resume ? (
        <div>
          <p className="text-sm text-gray-600 mb-2">Resume: {resume.filename}</p>
          <SkillsPreview skills={resume.skills} />
        </div>
      ) : (
        <ResumeDropzone
          onBrowse={handleBrowse}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          dragging={dragging}
          disabled={isLoading}
        />
      )}
      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-gray-600">
          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          Parsing resume...
        </div>
      )}
      {error && (
        <p className="mt-4 text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
