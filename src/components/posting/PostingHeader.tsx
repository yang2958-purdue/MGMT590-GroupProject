'use client';

import type { ScoredJobPosting } from '@/lib/types';

export function PostingHeader({ posting }: { posting: ScoredJobPosting }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">{posting.title}</h1>
      <p className="text-gray-600 mt-1">
        {posting.company} · {posting.location}
      </p>
      <a
        href={posting.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
      >
        Open in Browser
      </a>
    </div>
  );
}
