'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface StepGuardProps {
  children: ReactNode;
  fallbackUrl: string;
  condition: boolean;
}

export function StepGuard({ children, fallbackUrl, condition }: StepGuardProps) {
  const router = useRouter();
  useEffect(() => {
    if (!condition) {
      router.replace(fallbackUrl);
    }
  }, [condition, fallbackUrl, router]);
  if (!condition) return null;
  return <>{children}</>;
}
