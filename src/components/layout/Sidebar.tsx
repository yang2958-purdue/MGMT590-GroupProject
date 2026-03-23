'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import type { AppStep } from '@/lib/types';

const STEPS: { step: AppStep; label: string }[] = [
  { step: 'resume', label: 'Upload Resume' },
  { step: 'search', label: 'Search Config' },
  { step: 'results', label: 'Results' },
  { step: 'posting', label: 'Job Detail' },
  { step: 'tailor', label: 'Tailor Resume' },
];

function canNavigateTo(step: AppStep, store: ReturnType<typeof useAppStore.getState>): boolean {
  switch (step) {
    case 'resume':
      return true;
    case 'search':
      return !!store.resume;
    case 'results':
      return store.jobPostings.length > 0;
    case 'posting':
      return !!store.selectedPosting;
    case 'tailor':
      return !!store.tailoredResult;
    default:
      return false;
  }
}

function isStepComplete(step: AppStep, store: ReturnType<typeof useAppStore.getState>): boolean {
  switch (step) {
    case 'resume':
      return !!store.resume;
    case 'search':
      return store.jobPostings.length > 0;
    case 'results':
      return store.jobPostings.length > 0;
    case 'posting':
      return !!store.selectedPosting;
    case 'tailor':
      return !!store.tailoredResult;
    default:
      return false;
  }
}

function stepHref(step: AppStep): string {
  return `/${step}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const resume = useAppStore((s) => s.resume);
  const jobPostings = useAppStore((s) => s.jobPostings);
  const selectedPosting = useAppStore((s) => s.selectedPosting);
  const tailoredResult = useAppStore((s) => s.tailoredResult);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const store = useAppStore.getState();

  return (
    <aside className="w-[220px] shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <nav className="p-4 flex-1">
        <ul className="space-y-1">
          {STEPS.map(({ step, label }, idx) => {
            const complete = isStepComplete(step, store);
            const allowed = canNavigateTo(step, store);
            const href = stepHref(step);
            const active = pathname === href || pathname?.startsWith(href + '/');
            return (
              <li key={step}>
                {allowed ? (
                  <Link
                    href={href}
                    onClick={() => navigateTo(step)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      active ? 'bg-gray-100 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        complete ? 'bg-gray-800 text-white' : 'border border-gray-400 text-gray-600'
                      }`}
                    >
                      {complete ? '✓' : idx + 1}
                    </span>
                    <span className="flex-1">{label}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs">
                      {idx + 1}
                    </span>
                    <span>{label}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <span aria-hidden>⚙</span> Settings
        </Link>
      </div>
    </aside>
  );
}
