'use client';

export function KeywordPanel({
  matched,
  missing,
}: {
  matched: string[];
  missing: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Matched Keywords</h3>
        <div className="flex flex-wrap gap-1">
          {matched.length === 0 ? (
            <span className="text-sm text-gray-500">None</span>
          ) : (
            matched.map((k) => (
              <span
                key={k}
                className="rounded bg-green-100 px-2 py-0.5 text-sm text-green-800"
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Missing Keywords</h3>
        <div className="flex flex-wrap gap-1">
          {missing.length === 0 ? (
            <span className="text-sm text-gray-500">None</span>
          ) : (
            missing.map((k) => (
              <span
                key={k}
                className="rounded bg-red-100 px-2 py-0.5 text-sm text-red-800"
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
