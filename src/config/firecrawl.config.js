// Set VITE_FIRECRAWL_API_KEY in `.env.local` (see `.env.example`). Do not commit secrets.
export const FIRECRAWL_API_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIRECRAWL_API_KEY
    ? String(import.meta.env.VITE_FIRECRAWL_API_KEY)
    : '';

/** Firecrawl REST API base URL (v1). */
export const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

/**
 * When true, firecrawlAdapter returns hardcoded mock data instead of
 * calling the live API. Set `VITE_USE_FIRECRAWL_MOCK=true` in `.env.local` to enable.
 */
export const USE_MOCK =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_FIRECRAWL_MOCK === 'true';
