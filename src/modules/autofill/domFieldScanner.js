/**
 * Scan the live DOM for fillable form controls (content-script context).
 * Produces FormField-shaped objects compatible with fieldMapper / fieldFiller.
 */

import { inferDataKeyFromLabel } from './fieldInference.js';

let _jobbotAfCounter = 0;

/**
 * @returns {import('../scraper/firecrawlAdapter.js').FormField[]}
 */
export function scanFormFieldsInDocument() {
  const selector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]),' +
    'select:not([disabled]),textarea:not([disabled])';

  const nodes = Array.from(document.querySelectorAll(selector));
  /** @type {import('../scraper/firecrawlAdapter.js').FormField[]} */
  const out = [];
  const seenRadioNames = new Set();

  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    if (!el.isConnected) continue;

    const type = el instanceof HTMLInputElement ? (el.type || 'text').toLowerCase() : '';
    if (type === 'file') continue;

    if (type === 'radio' && el instanceof HTMLInputElement && el.name) {
      if (seenRadioNames.has(el.name)) continue;
      seenRadioNames.add(el.name);
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

    out.push({
      label: labelText || el.getAttribute('name') || fieldType,
      fieldType,
      selector: cssSel,
      isRequired: !!isRequired,
      suggestedDataKey,
    });
  }

  return out;
}

/**
 * @param {HTMLElement} el
 * @returns {string}
 */
function inferLabel(el) {
  if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
    const first = document.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
    if (first) {
      const g = first.closest('fieldset');
      if (g) {
        const leg = g.querySelector('legend');
        if (leg?.textContent?.trim()) return leg.textContent.trim();
      }
    }
  }

  if (el.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
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
    const parts = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean);
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
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (inputType === 'checkbox') return 'checkbox';
  if (inputType === 'radio') return 'radio';
  return 'input';
}
