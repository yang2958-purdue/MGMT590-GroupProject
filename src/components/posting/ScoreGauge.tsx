'use client';

interface ScoreGaugeProps {
  value: number;
  max: number;
  label: string;
}

export function ScoreGauge({ value, max, label }: ScoreGaugeProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const stroke = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="90" viewBox="0 0 90 90" className="transform -rotate-90">
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ - stroke}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-lg font-bold text-gray-900 mt-1">
        {max === 10 ? value.toFixed(1) : `${Math.round(value)}%`}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
