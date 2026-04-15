import { FIRECRAWL_API_KEY as ENV_FIRECRAWL } from '../config/firecrawl.config.js';
import { get, KEYS } from '../modules/storage.js';

/**
 * Firecrawl: chrome.storage.local first, then build-time `VITE_FIRECRAWL_API_KEY`.
 * @returns {Promise<string>}
 */
export async function getResolvedFirecrawlApiKey() {
  const stored = await get(KEYS.FIRECRAWL_API_KEY);
  const s = stored != null ? String(stored).trim() : '';
  if (s) return s;
  return String(ENV_FIRECRAWL || '').trim();
}

/**
 * OpenAI key stored in the extension for requests to the local Python server (header).
 * Empty string if unset — server may still use `OPENAI_API_KEY` from its environment.
 * @returns {Promise<string>}
 */
export async function getOpenAiApiKeyForRequests() {
  const stored = await get(KEYS.OPENAI_API_KEY);
  return stored != null ? String(stored).trim() : '';
}

/**
 * Headers for JSON POSTs to the local Python server when OpenAI may be forwarded.
 * @returns {Promise<Record<string, string>>}
 */
export async function buildJsonHeadersWithOptionalOpenAi() {
  const headers = { 'Content-Type': 'application/json' };
  const key = await getOpenAiApiKeyForRequests();
  if (key) headers['X-OpenAI-API-Key'] = key;
  return headers;
}
