/**
 * Field filler module — runs inside the content script context.
 *
 * Provides sequential field filling with delay, field highlighting,
 * and value injection that triggers framework-friendly change events.
 */

const HIGHLIGHT_STYLE = 'outline: 3px solid #6366f1; outline-offset: 2px; transition: outline 0.2s;';

/**
 * @typedef {import('./fieldMapper.js').FilledField} FilledField
 */

/**
 * Fill form fields sequentially with a delay between each.
 * "ready" fields are filled immediately; "pause_required" fields trigger a
 * pause and notify the side panel; "skipped" fields are ignored.
 *
 * The function yields control on pause and resumes when the returned
 * resolver callback is invoked (called by the content script message handler).
 *
 * @param {FilledField[]} fields  - Array of mapped fields from fieldMapper.
 * @param {number} delayMs        - Milliseconds to wait between fills.
 * @param {Object} hooks          - Callbacks for pause/resume coordination.
 * @param {function(): Promise<"resume"|"skip">} hooks.waitForResume
 *   Called when a pause_required field is hit; resolves when the user
 *   clicks Resume or Skip in the side panel.
 * @returns {Promise<void>}
 */
export async function fillFieldsSequentially(fields, delayMs, hooks) {
  const total = fields.filter((f) => f.status !== 'skipped').length;
  let filledCount = 0;

  for (let i = 0; i < fields.length; i++) {
    const { field, value, status } = fields[i];

    if (status === 'skipped') continue;

    sendStatus('AUTOFILL_STATUS', {
      currentIndex: i,
      filledCount,
      totalFields: total,
      fieldLabel: field.label,
      status: 'filling',
    });

    if (status === 'pause_required') {
      highlightField(field.selector, field.iframePath);

      sendStatus('AUTOFILL_PAUSED', {
        currentIndex: i,
        filledCount,
        totalFields: total,
        fieldLabel: field.label,
        reason: `Manual input required: "${field.label}"`,
      });

      const action = await hooks.waitForResume();
      unhighlightField(field.selector, field.iframePath);

      if (action === 'skip') {
        filledCount++;
        continue;
      }
      // "resume" — the user filled it manually, move on
      filledCount++;
      continue;
    }

    // status === "ready"
    await setFieldValue(field.selector, value, field.iframePath, field.fieldType);
    filledCount++;

    if (i < fields.length - 1) {
      await sleep(delayMs);
    }
  }

  sendStatus('AUTOFILL_COMPLETE', {
    filledCount,
    totalFields: total,
  });
}

// TODO: Multi-page support — after AUTOFILL_COMPLETE, scan for a "Next"
// or "Continue" button on the page and report its selector so the
// controller can decide whether to proceed.

/**
 * @param {string} id
 */
function escapeAttr(id) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(id)
    : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {HTMLInputElement} r
 */
function getRadioOptionLabel(r) {
  const root = r.ownerDocument;
  if (r.id) {
    const l = root.querySelector(`label[for="${escapeAttr(r.id)}"]`);
    if (l?.textContent?.trim()) return l.textContent.trim();
  }
  const parent = r.closest('label');
  if (parent?.textContent) return parent.textContent.replace(/\s+/g, ' ').trim();
  return (r.value || '').trim();
}

/**
 * @param {HTMLInputElement} el
 * @param {string} value
 */
function setRadioGroupValue(el, value) {
  const raw = String(value ?? '').trim();
  const dispatch = () => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  if (!el.name) {
    if (raw === el.value || raw.toLowerCase() === String(el.value).toLowerCase()) {
      el.checked = true;
      dispatch();
    }
    return;
  }

  const doc = el.ownerDocument;
  const group = doc.querySelectorAll(`input[type="radio"][name="${escapeAttr(el.name)}"]`);

  for (const r of group) {
    if (r.value === raw || String(r.value).toLowerCase() === raw.toLowerCase()) {
      r.checked = true;
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }

  const wantYes = /^(yes|y|true|1)$/i.test(raw);
  const wantNo = /^(no|n|false|0)$/i.test(raw);

  for (const r of group) {
    const lab = getRadioOptionLabel(r).toLowerCase();
    const rv = String(r.value || '').toLowerCase();
    if (wantYes && (/^(y|yes|true|1)$/i.test(rv) || /\byes\b/.test(lab))) {
      r.checked = true;
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (wantNo && (/^(n|no|false|0)$/i.test(rv) || (/\bno\b/.test(lab) && !/\bnot\s+sure\b/.test(lab)))) {
      r.checked = true;
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }
}

/**
 * @param {HTMLOptionElement[]} opts
 * @param {string} raw
 */
function findMatchingOption(opts, raw) {
  const low = raw.toLowerCase();

  let m = opts.find((o) => o.value === raw);
  if (m) return m;

  m = opts.find((o) => o.textContent.trim().toLowerCase() === low);
  if (m) return m;

  m = opts.find((o) => (o.value || '').toLowerCase() === low);
  if (m) return m;

  if (/^(yes|y|true|1)$/i.test(raw)) {
    m = opts.find((o) => {
      const t = o.textContent.trim().toLowerCase();
      const v = (o.value || '').toLowerCase();
      return (
        /^(y|yes|true|1)$/i.test(v) ||
        /^(y|yes|true|1)$/i.test(t) ||
        /\byes\b/.test(t) ||
        (t.includes('authorized') && t.includes('work')) ||
        (t.includes('legally') && t.includes('work')) ||
        (t.includes('i am') && t.includes('eligible'))
      );
    });
    if (m) return m;
  }

  if (/^(no|n|false|0)$/i.test(raw)) {
    m = opts.find((o) => {
      const t = o.textContent.trim().toLowerCase();
      const v = (o.value || '').toLowerCase();
      return (
        /^(n|no|false|0)$/i.test(v) ||
        /^(n|no|false|0)$/i.test(t) ||
        (/\bno\b/.test(t) && !t.includes('not sure')) ||
        (t.includes('not') && t.includes('authorized'))
      );
    });
    if (m) return m;
  }

  m = opts.find((o) => {
    const t = o.textContent.trim().toLowerCase();
    if (!t) return false;
    return t.includes(low) || low.includes(t);
  });
  return m ?? null;
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} value
 */
function setSelectValue(select, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return;

  const opts = Array.from(select.options);
  const pick = findMatchingOption(opts, raw);
  if (!pick) return;

  select.value = pick.value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  select.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Normalize text for fuzzy option matching.
 * @param {string} s
 */
function normText(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
}

/**
 * Walk nested same-origin iframes from the top document (content script context).
 * @param {number[]|undefined} iframePath
 * @returns {Document | null}
 */
function resolveRootDocument(iframePath) {
  if (!iframePath || iframePath.length === 0) return document;
  let doc = document;
  for (const idx of iframePath) {
    const list = doc.querySelectorAll('iframe');
    const fr = list[idx];
    if (!fr?.contentDocument) return null;
    doc = fr.contentDocument;
  }
  return doc;
}

/**
 * Set a form field's value and dispatch events so that frameworks
 * (React, Angular, Vue) pick up the change.
 *
 * @param {string} selector - CSS selector for the target element (in the leaf document).
 * @param {string} value    - The value to set.
 * @param {number[]|undefined} [iframePath] - Nested iframe indices when the control is not in the top document.
 */
export async function setFieldValue(selector, value, iframePath, fieldType) {
  const root = resolveRootDocument(iframePath);
  if (!root) return;
  const el = root.querySelector(selector);
  if (!el) return;

  if (fieldType === 'select') {
    await setAnyDropdownValue(el, value);
    return;
  }

  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    el.checked = value === 'true' || value === '1' || /^yes$/i.test(String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (el instanceof HTMLInputElement && el.type === 'radio') {
    setRadioGroupValue(el, value);
    return;
  }

  if (el instanceof HTMLSelectElement) {
    setSelectValue(el, value);
    return;
  }

  if (isComboboxLike(el)) {
    await setComboboxValue(el, value);
    return;
  }

  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

  if (nativeInputValueSetter && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Handle both native and custom dropdown widgets.
 * @param {Element} el
 * @param {string} value
 */
async function setAnyDropdownValue(el, value) {
  if (el instanceof HTMLSelectElement) {
    setSelectValue(el, value);
    return;
  }

  const target = resolveDropdownTarget(el);
  if (!target) return;

  if (target instanceof HTMLSelectElement) {
    setSelectValue(target, value);
    return;
  }

  await setComboboxValue(target, value);
}

/**
 * Try to find the real interactive dropdown control from a container selector.
 * @param {Element} el
 * @returns {Element|null}
 */
function resolveDropdownTarget(el) {
  if (isComboboxLike(el) || el instanceof HTMLSelectElement) return el;

  const local = el.querySelector?.(
    'select,[role="combobox"],button[aria-haspopup="listbox"],input[aria-haspopup="listbox"],[data-automation-id*="dropdown"],[data-automation-id*="promptButton"]'
  );
  if (local) return local;

  let p = el.parentElement;
  for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
    const cand = p.querySelector(
      'select,[role="combobox"],button[aria-haspopup="listbox"],input[aria-haspopup="listbox"],[data-automation-id*="dropdown"],[data-automation-id*="promptButton"]'
    );
    if (cand) return cand;
  }

  return null;
}

/**
 * @param {Element} el
 */
function isComboboxLike(el) {
  const role = (el.getAttribute('role') || '').toLowerCase();
  const popup = (el.getAttribute('aria-haspopup') || '').toLowerCase();
  if (role === 'combobox') return true;
  if (popup === 'listbox') return true;
  if (el.tagName === 'BUTTON' && popup) return true;
  if (el instanceof HTMLInputElement && el.getAttribute('aria-controls') && el.getAttribute('aria-autocomplete')) return true;
  return false;
}

/**
 * Attempt to set value on custom combobox widgets (e.g. Workday listboxes).
 * @param {Element} el
 * @param {string} value
 */
async function setComboboxValue(el, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return;

  const openDropdown = () => {
    if (!(el instanceof HTMLElement)) return;
    el.focus();
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.click();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  };

  openDropdown();

  if (el instanceof HTMLInputElement && !el.readOnly) {
    el.value = raw;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  for (let i = 0; i < 10; i++) {
    const option = findCustomDropdownOption(el.ownerDocument, raw);
    if (option) {
      option.click();
      if (el instanceof HTMLElement) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      return;
    }
    if (i === 3 || i === 6) openDropdown();
    await sleep(120);
  }
}

/**
 * @param {Document} doc
 * @param {string} raw
 * @returns {HTMLElement|null}
 */
function findCustomDropdownOption(doc, raw) {
  const low = normText(raw);
  const candidates = Array.from(
    doc.querySelectorAll(
      '[role="option"],li[role="option"],[data-automation-id*="option"],[data-automation-id*="promptOption"],[data-automation-id*="dropdownOption"],[id*="option"]'
    )
  );

  const pick = candidates.find((node) => {
    const text = normText(node.textContent || '');
    if (!text) return false;
    return text === low || text.includes(low) || low.includes(text);
  });

  return pick instanceof HTMLElement ? pick : null;
}

/**
 * Add a visible CSS outline to highlight the currently active field.
 * @param {string} selector
 * @param {number[]|undefined} [iframePath]
 */
export function highlightField(selector, iframePath) {
  const root = resolveRootDocument(iframePath);
  if (!root) return;
  const el = root.querySelector(selector);
  if (el) {
    el.dataset.prevStyle = el.getAttribute('style') || '';
    el.setAttribute('style', `${el.dataset.prevStyle}; ${HIGHLIGHT_STYLE}`);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Remove the highlight outline from a field.
 * @param {string} selector
 * @param {number[]|undefined} [iframePath]
 */
export function unhighlightField(selector, iframePath) {
  const root = resolveRootDocument(iframePath);
  if (!root) return;
  const el = root.querySelector(selector);
  if (el) {
    el.setAttribute('style', el.dataset.prevStyle || '');
    delete el.dataset.prevStyle;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendStatus(type, data) {
  chrome.runtime.sendMessage({ type, ...data });
}
