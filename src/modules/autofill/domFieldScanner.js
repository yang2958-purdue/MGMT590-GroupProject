/**
 * Scan the live DOM for fillable form controls (content-script context).
 * Produces FormField-shaped objects compatible with fieldMapper / fieldFiller.
 * Recurses into same-origin iframes (ATS embeds often render the form in an iframe).
 * Walks open shadow roots so controls inside web components (common on Workday) are included.
 */

import { inferDataKeyFromLabel } from './fieldInference.js';

let _jobbotAfCounter = 0;

const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]),' +
  'select:not([disabled]),textarea:not([disabled]),' +
  'button[aria-haspopup="listbox"]:not([disabled]),' +
  '[role="combobox"]:not([aria-disabled="true"])';

/**
 * True when control metadata looks like Work Experience row **N** date (From/To / month / year).
 * Uses id, name, data-automation-id, aria-label — CSS `[id*=...]` misses when only aria carries scope.
 * @param {HTMLElement} el
 */
function elementLooksLikeWorkExperienceDateField(el) {
  const blob = [
    el.id,
    el.getAttribute('name'),
    el.getAttribute('data-automation-id'),
    el.getAttribute('aria-label'),
  ]
    .filter(Boolean)
    .join(' ');
  const c = blob.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!/workexperience\d+/.test(c)) return false;
  if (
    /(jobtitle|company|location|roledescription|currentlywork|icurrentlywork|skills)/.test(c)
  ) {
    return false;
  }
  return /from|to|date|datesection|month|year|startdate|enddate/.test(c);
}

/**
 * Same as {@link Document#querySelectorAll} but also traverses open shadow roots (Workday embeds
 * From/To and other controls under web components).
 * @param {Document} doc
 * @returns {HTMLElement[]}
 */
function queryControlsInDocumentAndShadowRoots(doc) {
  /** @type {HTMLElement[]} */
  const out = [];
  /** @type {(Document|ShadowRoot)[]} */
  const roots = [doc];
  while (roots.length) {
    const r = roots.pop();
    if (!r) continue;
    try {
      r.querySelectorAll(CONTROL_SELECTOR).forEach((n) => {
        if (n instanceof HTMLElement) out.push(n);
      });
    } catch {
      /* ignore */
    }
    let hosts;
    try {
      hosts = r.querySelectorAll('*');
    } catch {
      continue;
    }
    for (const el of hosts) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
    }
  }
  return out;
}

/**
 * Work Experience date controls missed when generic CONTROL_SELECTOR excludes them (e.g. disabled)
 * or role/id variants differ by tenant.
 * @param {Document} doc
 * @returns {HTMLElement[]}
 */
function queryWorkdayWxDateFallbackInDocumentAndShadowRoots(doc) {
  /** @type {HTMLElement[]} */
  const out = [];
  /** @type {(Document|ShadowRoot)[]} */
  const roots = [doc];
  while (roots.length) {
    const r = roots.pop();
    if (!r) continue;
    try {
      r
        .querySelectorAll('input, select, textarea, button, [role="combobox"]')
        .forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n instanceof HTMLInputElement) {
            const t = (n.type || 'text').toLowerCase();
            if (['hidden', 'submit', 'reset', 'image', 'file'].includes(t)) return;
          }
          if (elementLooksLikeWorkExperienceDateField(n)) out.push(n);
        });
    } catch {
      /* ignore */
    }
    let hosts;
    try {
      hosts = r.querySelectorAll('*');
    } catch {
      continue;
    }
    for (const el of hosts) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
    }
  }
  return out;
}

/**
 * @returns {import('../scraper/firecrawlAdapter.js').FormField[]}
 */
export function scanFormFieldsInDocument() {
  /** @type {import('../scraper/firecrawlAdapter.js').FormField[]} */
  const out = [];
  const seenRadioKeys = new Set();
  /** @type {{ wxFallbackMerged: number }} */
  const scanStats = { wxFallbackMerged: 0 };

  scanInto(document, [], out, seenRadioKeys, scanStats);

  return out;
}

/**
 * @param {Document} doc
 * @param {number[]} iframePath indices from top document into nested iframes
 * @param {import('../scraper/firecrawlAdapter.js').FormField[]} out
 * @param {Set<string>} seenRadioKeys
 * @param {{ wxFallbackMerged: number }} [scanStats]
 */
function scanInto(doc, iframePath, out, seenRadioKeys, scanStats) {
  const primary = queryControlsInDocumentAndShadowRoots(doc);
  const fallback = queryWorkdayWxDateFallbackInDocumentAndShadowRoots(doc);
  const seenEl = new Set(primary);
  /** @type {HTMLElement[]} */
  const nodes = [...primary];
  for (const el of fallback) {
    if (!(el instanceof HTMLElement)) continue;
    if (!seenEl.has(el)) {
      seenEl.add(el);
      nodes.push(el);
      if (scanStats) scanStats.wxFallbackMerged += 1;
    }
  }

  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    if (!el.isConnected) continue;

    const type = el instanceof HTMLInputElement ? (el.type || 'text').toLowerCase() : '';
    if (type === 'file') continue;

    if (type === 'radio' && el instanceof HTMLInputElement && el.name) {
      const rk = `${iframePath.join(',')}::${el.name}`;
      if (seenRadioKeys.has(rk)) continue;
      seenRadioKeys.add(rk);
    }

    let marker = el.getAttribute('data-jobbot-af');
    if (!marker) {
      marker = `jb${Date.now()}-${_jobbotAfCounter++}`;
      el.setAttribute('data-jobbot-af', marker);
    }
    const esc =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(marker)
        : marker.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const cssSel = `[data-jobbot-af="${esc}"]`;

    const labelText = inferLabel(el);
    const fieldType = mapFieldType(el, type);
    // Join label, id, placeholder, automation id, and name. Workday encodes `startDate` / `endDate` /
    // `dateSection*` in `id`; omitting id broke inference for month/year inputs whose visible label is
    // only e.g. "Month".
    const inferKeySource = [
      (labelText || '').trim(),
      (el.getAttribute('placeholder') || '').trim(),
      (el.id || '').replace(/[_-]+/g, ' ').trim(),
      (el.getAttribute('data-automation-id') || '').replace(/[_-]+/g, ' ').trim(),
      (el.getAttribute('name') || '').replace(/[_-]+/g, ' ').trim(),
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const suggestedDataKey = inferDataKeyFromLabel(inferKeySource, fieldType);

    const isRequired =
      (el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      (el.required || el.getAttribute('aria-required') === 'true');

    /** @type {import('../scraper/firecrawlAdapter.js').FormField} */
    const field = {
      label: labelText || el.getAttribute('name') || fieldType,
      fieldType,
      selector: cssSel,
      isRequired: !!isRequired,
      suggestedDataKey,
      inferenceSource: inferKeySource,
    };
    if (iframePath.length) {
      field.iframePath = [...iframePath];
    }
    out.push(field);
  }

  const iframes = doc.querySelectorAll('iframe');
  for (let i = 0; i < iframes.length; i++) {
    try {
      const inner = iframes[i].contentDocument;
      if (inner) {
        scanInto(inner, [...iframePath, i], out, seenRadioKeys, scanStats);
      }
    } catch {
      // cross-origin iframe
    }
  }
}

/**
 * @param {HTMLElement} el
 * @returns {string}
 */
function inferLabel(el) {
  const root = el.ownerDocument;

  if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
    const first = root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
    if (first) {
      const g = first.closest('fieldset');
      if (g) {
        const leg = g.querySelector('legend');
        if (leg?.textContent?.trim()) return leg.textContent.trim();
      }
    }
  }

  if (el.id) {
    const lab = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lab?.textContent?.trim()) return lab.textContent.trim().replace(/\s+/g, ' ');
  }

  let p = el.parentElement;
  for (let d = 0; d < 6 && p; d++, p = p.parentElement) {
    const lab = p.querySelector?.(':scope > label');
    if (lab?.textContent?.trim()) return lab.textContent.trim().replace(/\s+/g, ' ');
  }

  const aria = el.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => root.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (parts.length) return parts.join(' ').replace(/\s+/g, ' ');
  }

  const ph = el.getAttribute('placeholder');
  if (ph?.trim()) return ph.trim();

  const name = el.getAttribute('name');
  if (name?.trim()) return name.replace(/[_-]+/g, ' ').trim();

  return '';
}

/**
 * @param {HTMLElement} el
 * @param {string} inputType
 * @returns {'input'|'select'|'textarea'|'checkbox'|'radio'}
 */
function mapFieldType(el, inputType) {
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLElement && el.isContentEditable) return 'textarea';
  if (isComboboxLike(el)) return 'select';
  if (el instanceof HTMLSelectElement) return 'select';
  if (inputType === 'checkbox') return 'checkbox';
  if ((el.getAttribute('role') || '').toLowerCase() === 'checkbox') return 'checkbox';
  if (inputType === 'radio') return 'radio';
  return 'input';
}

/**
 * Detect custom dropdown/combobox widgets (common on Workday/ATS forms).
 * Workday may set role="combobox" on rich-text / description fields — those are not dropdowns.
 * @param {HTMLElement} el
 */
function isComboboxLike(el) {
  if (el instanceof HTMLTextAreaElement) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return false;
  const role = (el.getAttribute('role') || '').toLowerCase();
  if (role === 'textbox' && !(el instanceof HTMLInputElement)) return false;
  const hasPopup = (el.getAttribute('aria-haspopup') || '').toLowerCase();
  if (role === 'combobox') return true;
  if (hasPopup === 'listbox') return true;
  if (el.tagName === 'BUTTON' && hasPopup) return true;
  if (el instanceof HTMLInputElement && el.getAttribute('aria-controls') && el.getAttribute('aria-autocomplete')) return true;
  return false;
}
