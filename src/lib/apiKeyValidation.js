import { FIRECRAWL_BASE_URL } from '../config/firecrawl.config.js';
import { getResolvedFirecrawlApiKey, getOpenAiApiKeyForRequests } from './apiKeys.js';
import { SCRAPER_URL } from './constants.js';

/** @type {{ ts: number; ttl: number; result: { firecrawl: object; openai: object } | null }} */
let validationCache = { ts: 0, ttl: 45_000, result: null };

export function invalidateApiKeyValidationCache() {
  validationCache.result = null;
  validationCache.ts = 0;
}

/**
 * Recompute validation for the current resolved keys (storage + env fallback for Firecrawl).
 * @returns {Promise<{ firecrawl: ValidationSlice; openai: ValidationSlice }>}
 */
export async function validateResolvedApiKeys() {
  const now = Date.now();
  if (validationCache.result && now - validationCache.ts < validationCache.ttl) {
    return validationCache.result;
  }
  const result = await validateResolvedApiKeysInternal();
  validationCache = { ts: now, ttl: 45_000, result };
  return result;
}

/**
 * @typedef {Object} ValidationSlice
 * @property {boolean} ok           - true if key is usable or optional case is satisfied
 * @property {'ok'|'missing'|'invalid'|'error'|'server'} kind
 * @property {string} message
 */

async function validateResolvedApiKeysInternal() {
  const fcKey = await getResolvedFirecrawlApiKey();
  const oaKey = await getOpenAiApiKeyForRequests();
  const [firecrawl, openai] = await Promise.all([validateFirecrawlKey(fcKey), validateOpenAiKey(oaKey)]);
  return { firecrawl, openai };
}

/**
 * @param {string} key
 * @returns {Promise<ValidationSlice>}
 */
async function validateFirecrawlKey(key) {
  const k = (key || '').trim();
  if (!k) {
    return {
      ok: false,
      kind: 'missing',
      message:
        'No Firecrawl key in storage or build env — remote field extraction is off; autofill uses the live tab DOM only.',
    };
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${k}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['markdown'],
      }),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: 'invalid', message: 'Firecrawl returned unauthorized — check the key.' };
    }
    if (res.status === 429) {
      return {
        ok: false,
        kind: 'error',
        message: 'Firecrawl rate limited this check — try again shortly; your key may still be valid.',
      };
    }
    if (res.ok) {
      return { ok: true, kind: 'ok', message: 'Firecrawl accepted this key (quick scrape check).' };
    }
    const t = await res.text().catch(() => '');
    return {
      ok: false,
      kind: 'invalid',
      message: `Firecrawl error (${res.status}). ${t.slice(0, 160)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, kind: 'error', message: `Could not reach Firecrawl: ${msg}` };
  }
}

/**
 * @param {string} extKey - Key stored in extension (empty if relying on server .env)
 * @returns {Promise<ValidationSlice>}
 */
async function validateOpenAiKey(extKey) {
  const k = (extKey || '').trim();

  if (!k) {
    let serverHasKey = false;
    try {
      const r = await fetch(`${SCRAPER_URL}/health`, { method: 'GET' });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        serverHasKey = Boolean(data.openai_configured);
      }
    } catch {
      /* server down */
    }

    if (serverHasKey) {
      return {
        ok: true,
        kind: 'server',
        message:
          'No OpenAI key in the extension — the Python server reports OPENAI_API_KEY is set in its environment. LLM features can use that.',
      };
    }
    return {
      ok: false,
      kind: 'missing',
      message:
        'No OpenAI key in the extension and the server did not report one — set a key here or OPENAI_API_KEY in server .env, or start the Python server.',
    };
  }

  if (!k.startsWith('sk-')) {
    return {
      ok: false,
      kind: 'invalid',
      message: 'OpenAI secret keys should start with sk- — check for typos or spaces.',
    };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${k}` },
    });
    if (res.status === 401) {
      return { ok: false, kind: 'invalid', message: 'OpenAI rejected this key (invalid or revoked).' };
    }
    if (res.ok) {
      return { ok: true, kind: 'ok', message: 'OpenAI accepted this key.' };
    }
    const t = await res.text().catch(() => '');
    return { ok: false, kind: 'invalid', message: `OpenAI error (${res.status}). ${t.slice(0, 160)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, kind: 'error', message: `Could not reach OpenAI: ${msg}` };
  }
}
