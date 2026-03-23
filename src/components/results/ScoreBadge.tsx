'use client';

interface ScoreBadgeProps {
  value: number;
  type: 'fit' | 'ats';
}

export function ScoreBadge({ value, type }: ScoreBadgeProps) {
  const isFit = type === 'fit';
  const green = isFit ? value >= 7 : value >= 70;
  const amber = isFit ? value >= 4 && value < 7 : value >= 40 && value < 70;
  const red = !green && !amber;
  const bg = green
    ? 'bg-green-100 text-green-800'
    : amber
      ? 'bg-amber-100 text-amber-800'
      : red
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800';
  return (
    <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${bg}`}>
      {isFit ? value.toFixed(1) : `${Math.round(value)}%`}
    </span>
  );
}
