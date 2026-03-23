'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[RootLayout] Rendering RootLayout component');

  const { backendReady, setBackendReady, setConfigStatus } = useAppStore();

  useEffect(() => {
    console.log('[RootLayout] useEffect backendReady check - initializing backend detection');
    if (typeof window === 'undefined') return;
    if (window.electronAPI?.onBackendReady) {
      console.log('[RootLayout] Detected electronAPI.onBackendReady, registering handler');
      window.electronAPI.onBackendReady(() => setBackendReady(true));
    } else {
      console.log('[RootLayout] No electronAPI.onBackendReady, falling back to HTTP health check');
      fetch('http://localhost:7823/health')
        .then((r) => {
          console.log('[RootLayout] Health check response status:', r.status);
          return r.ok ? setBackendReady(true) : undefined;
        })
        .catch((err) => {
          console.log('[RootLayout] Health check failed, assuming backend ready. Error:', err);
          setBackendReady(true);
        });
    }
  }, [setBackendReady]);

  useEffect(() => {
    console.log('[RootLayout] useEffect config load - backendReady:', backendReady);
    if (!backendReady) return;
    api
      .getConfig()
      .then((config) => {
        console.log('[RootLayout] Config loaded successfully');
        setConfigStatus(config);
      })
      .catch((err) => {
        console.log('[RootLayout] Failed to load config, setting null. Error:', err);
        setConfigStatus(null);
      });
  }, [backendReady, setConfigStatus]);

  return (
    <html lang="en">
      <body className="min-h-screen flex bg-gray-50">
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto p-6 relative">
          <ErrorBoundary>
          {!backendReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">Starting JobBot...</p>
            </div>
          ) : null}
          <div className={backendReady ? '' : 'opacity-0'}>{children}</div>
          </ErrorBoundary>
        </main>
      </body>
    </html>
  );
}
