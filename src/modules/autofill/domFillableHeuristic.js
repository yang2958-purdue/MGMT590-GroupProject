/**
 * Deep DOM fallbacks when CSS-only queries miss Workday / ATS custom controls.
 * Used by domFieldScanner and by inline executeScript in autofillController.
 */

/**
 * True if this element is likely a fill target (dropdown, text, radio group, etc.).
 * Kept conservative enough to avoid matching random layout divs.
 * @param {Element} el
 * @returns {boolean}
 */
export function elementLooksFillableHeuristic(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.isConnected) return false;

  const tag = el.tagName?.toUpperCase?.() || '';

  if (tag === 'SELECT') return true;
  if (tag === 'TEXTAREA') return true;

  if (tag === 'INPUT') {
    if (!(el instanceof HTMLInputElement)) return false;
    const t = (el.type || 'text').toLowerCase();
    if (['hidden', 'submit', 'file', 'reset', 'image'].includes(t)) return false;
    return true;
  }

  const role = (el.getAttribute('role') || '').toLowerCase();
  const ap = (el.getAttribute('aria-haspopup') || '').toLowerCase();
  const tabIndex = el.getAttribute('tabindex');
  const auto = (el.getAttribute('data-automation-id') || '').toLowerCase();

  if (role === 'combobox') return true;
  if (role === 'textbox' && ap) return true;
  if (role === 'textbox' && (el.getAttribute('aria-autocomplete') || el.getAttribute('aria-controls'))) return true;
  if (role === 'radiogroup' || role === 'listbox') return true;
  if (role === 'radio' && el.getAttribute('aria-checked') != null) return true;

  if (ap === 'listbox' || ap === 'dialog' || ap === 'menu' || ap === 'true') return true;

  if (tag === 'BUTTON' || role === 'button') {
    if (ap) return true;
  }

  if (
    /promptbutton|selectwidget|singleselect|moniker|monikerinput|dropdown|questionanswer|formfield|selectone|multiselect/.test(
      auto,
    )
  ) {
    return true;
  }

  if (auto.includes('prompt') && (tag === 'BUTTON' || role === 'button' || role === 'combobox')) return true;

  // Focusable custom widget without standard tag
  if (tabIndex !== null && tabIndex !== '-1' && (role === 'combobox' || ap)) return true;

  return false;
}

/**
 * Walk document + open shadow roots; collect elements matching {@link elementLooksFillableHeuristic}.
 * @param {Document|ShadowRoot} root
 * @returns {HTMLElement[]}
 */
export function collectDeepFallbackCandidates(root) {
  /** @type {HTMLElement[]} */
  const out = [];
  const seen = new Set();
  /** @type {(Document|ShadowRoot)[]} */
  const stack = [root];

  while (stack.length) {
    const r = stack.pop();
    if (!r) continue;

    let children;
    try {
      children = r.querySelectorAll('*');
    } catch {
      continue;
    }

    for (const el of children) {
      if (!(el instanceof HTMLElement)) continue;
      if (elementLooksFillableHeuristic(el) && !seen.has(el)) {
        seen.add(el);
        out.push(el);
      }
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }

  return out;
}
