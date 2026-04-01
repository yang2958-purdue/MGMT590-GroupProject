/**
 * Scan the live DOM for fillable form controls (content-script context).
 * Produces FormField-shaped objects compatible with fieldMapper / fieldFiller.
 * Recurses into same-origin iframes (ATS embeds often render the form in an iframe).
 */

import { inferDataKeyFromLabel } from './fieldInference.js';

let _jobbotAfCounter = 0;

const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]),' +
  'select:not([disabled]),textarea:not([disabled]),' +
  'button[aria-haspopup="listbox"]:not([disabled]),' +
  '[role="combobox"]:not([aria-disabled="true"])';

/**
 * @returns {import('../scraper/firecrawlAdapter.js').FormField[]}
 */
export function scanFormFieldsInDocument() {
  /** @type {import('../scraper/firecrawlAdapter.js').FormField[]} */
  const out = [];
  const seenRadioKeys = new Set();

  scanInto(document, [], out, seenRadioKeys);

  return out;
}

/**
 * @param {Document} doc
 * @param {number[]} iframePath indices from top document into nested iframes
 * @param {import('../scraper/firecrawlAdapter.js').FormField[]} out
 * @param {Set<string>} seenRadioKeys
 */
function scanInto(doc, iframePath, out, seenRadioKeys) {
  const nodes = Array.from(doc.querySelectorAll(CONTROL_SELECTOR));

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
    const contextLabel = `${labelText} ${el.getAttribute('placeholder') || ''} ${el.getAttribute('name') || ''}`.trim();
    const suggestedDataKey = inferDataKeyFromLabel(contextLabel, fieldType);

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
        scanInto(inner, [...iframePath, i], out, seenRadioKeys);
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
  if (isComboboxLike(el)) return 'select';
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (inputType === 'checkbox') return 'checkbox';
  if (inputType === 'radio') return 'radio';
  return 'input';
}

/**
 * Detect custom dropdown/combobox widgets (common on Workday/ATS forms).
 * @param {HTMLElement} el
 */
function isComboboxLike(el) {
  const role = (el.getAttribute('role') || '').toLowerCase();
  const hasPopup = (el.getAttribute('aria-haspopup') || '').toLowerCase();
  if (role === 'combobox') return true;
  if (hasPopup === 'listbox') return true;
  if (el.tagName === 'BUTTON' && hasPopup) return true;
  if (el instanceof HTMLInputElement && el.getAttribute('aria-controls') && el.getAttribute('aria-autocomplete')) return true;
  return false;
}
