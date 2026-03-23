'use client';

import { SearchForm } from '@/components/search/SearchForm';
import { useAppStore } from '@/lib/store';

export default function SearchPage() {
  const resume = useAppStore((s) => s.resume);
  const error = useAppStore((s) => s.error);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Search Config</h1>
      {!resume ? (
        <p className="text-gray-600">Upload a resume first to run a search.</p>
      ) : (
        <>
          <SearchForm />
          {error && (
            <p className="mt-4 text-red-600 text-sm" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
