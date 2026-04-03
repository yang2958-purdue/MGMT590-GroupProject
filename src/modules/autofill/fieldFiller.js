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
 * Parse date text/range into {start, end} with month/year pairs.
 * Supports:
 * - "May 2024 - Aug 2025"
 * - "05/2024 - 08/2025"
 * - "2022 - 2024"
 * - "Jan 2023 - Present"
 * @param {string} text
 * @returns {{ start: { month: string, year: string } | null, end: { month: string, year: string } | null }}
 */
function parseDateRange(text) {
  const monthMap = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  /**
   * @param {string} chunk
   * @returns {{ month: string, year: string } | null}
   */
  const parseSingle = (chunk) => {
    const c = (chunk || '').trim().toLowerCase();
    if (!c || c === 'present' || c === 'current') return null;
    let m = c.match(
      /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b[\s,/-]*(\d{4})/i
    );
    if (m) return { month: monthMap[m[1].toLowerCase()] || '', year: m[2] };

    m = c.match(/\b(\d{1,2})\s*\/\s*(\d{4})\b/);
    if (m) return { month: String(Math.max(1, Math.min(12, Number(m[1])))).padStart(2, '0'), year: m[2] };

    m = c.match(/\b(19|20)\d{2}\b/);
    if (m) return { month: '01', year: m[0] };

    return null;
  };

  const normalized = String(text || '').replace(/[–—]/g, '-');
  const parts = normalized.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { start: parseSingle(parts[0]), end: parseSingle(parts[1]) };
  }
  return { start: parseSingle(normalized), end: null };
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

  if (isWorkdayDateSectionInput(el)) {
    setWorkdayDateSectionValue(el, value);
    return;
  }

  if (isWorkdaySkillsInput(el)) {
    await setWorkdaySkillsInputValue(el, value);
    return;
  }

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
 * Workday date fields are split into month/year input pairs.
 * @param {Element} el
 */
function isWorkdayDateSectionInput(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const id = (el.id || '').toLowerCase();
  return id.includes('datesectionmonth-input') || id.includes('datesectionyear-input');
}

/**
 * Workday skills control is a searchable multi-select input.
 * @param {Element} el
 */
function isWorkdaySkillsInput(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const id = (el.id || '').toLowerCase();
  const name = (el.getAttribute('name') || '').toLowerCase();
  return id.includes('skills--skills') || name === 'skills';
}

/**
 * Fill Workday split date inputs from a combined date/range string.
 * @param {HTMLInputElement} el
 * @param {string} value
 */
function setWorkdayDateSectionValue(el, value) {
  const parsed = parseDateRange(String(value || ''));
  const id = (el.id || '').toLowerCase();
  const wantsEnd = id.includes('enddate');
  const wantsMonth = id.includes('datesectionmonth-input');
  const target = wantsEnd ? (parsed.end || parsed.start) : (parsed.start || parsed.end);
  if (!target) return;

  const nextValue = wantsMonth ? target.month : target.year;
  if (!nextValue) return;

  el.focus();
  el.value = nextValue;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Fill Workday skills multiselect by typing one skill at a time.
 * @param {HTMLInputElement} el
 * @param {string} value
 */
async function setWorkdaySkillsInputValue(el, value) {
  const skills = String(value || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 12);
  if (!skills.length) return;

  for (const skill of skills) {
    const beforeCount = getWorkdayMultiSelectCount(el);

    el.focus();
    el.click();
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.value = skill;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await sleep(120);

    // Workday multiselect: click the first row matching the typed skill token.
    if (!(await clickFirstWorkdaySkillOption(el.ownerDocument, skill))) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await sleep(80);
      await clickFirstWorkdaySkillOption(el.ownerDocument, skill);
    }

    // Confirm selection on the input itself for tenants that require Enter.
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    const option = findCustomDropdownOption(el.ownerDocument, skill);
    if (option) {
      option.click();
    } else {
      // Some Workday multiselects allow free entry with Enter.
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    }

    // Ensure the skill is actually committed before moving on.
    if (!(await waitForSkillCommitted(el, skill, beforeCount, 1000))) {
      // Fallback pass: re-issue a stronger commit sequence.
      el.focus();
      el.click();
      el.value = skill;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await sleep(120);
      await clickFirstWorkdaySkillOption(el.ownerDocument, skill);
      const fallbackOption = findCustomDropdownOption(el.ownerDocument, skill);
      if (fallbackOption) fallbackOption.click();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      await waitForSkillCommitted(el, skill, beforeCount, 1200);
    }
  }

  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Get selected count from Workday multiselect aria helper text.
 * @param {HTMLInputElement} el
 * @returns {number}
 */
function getWorkdayMultiSelectCount(el) {
  const wrapper = el.closest('[data-automation-id="multiSelectContainer"]');
  if (!wrapper) return -1;
  const helper = wrapper.querySelector('[data-automation-id="promptAriaInstruction"]');
  const txt = (helper?.textContent || '').trim().toLowerCase();
  const m = txt.match(/(\d+)\s+items?\s+selected/);
  return m ? Number(m[1]) : -1;
}

/**
 * Detect whether the current multiselect already contains the skill text.
 * @param {HTMLInputElement} el
 * @param {string} skill
 * @returns {boolean}
 */
function hasSkillInSelectedArea(el, skill) {
  const wrapper = el.closest('[data-automation-id="multiSelectContainer"]');
  if (!wrapper) return false;
  const needle = normText(skill);
  if (!needle) return false;

  // Only inspect selected-value/label regions; do not use full wrapper text
  // because it can include open dropdown options and in-progress typed input.
  const selectedNodes = Array.from(
    wrapper.querySelectorAll(
      '[data-automation-id="promptSelectionLabel"],[data-automation-id*="selected"],[data-uxi-multiselectlistitem-isselected="true"] [data-automation-id="promptOption"]'
    )
  );
  if (!selectedNodes.length) return false;

  return selectedNodes.some((n) => normText(n.textContent || '').includes(needle));
}

/**
 * Wait until Workday confirms the skill was added.
 * @param {HTMLInputElement} el
 * @param {string} skill
 * @param {number} beforeCount
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitForSkillCommitted(el, skill, beforeCount, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const afterCount = getWorkdayMultiSelectCount(el);
    if (beforeCount >= 0 && afterCount > beforeCount) return true;
    if (beforeCount < 0 && hasSkillInSelectedArea(el, skill)) return true;
    await sleep(80);
  }
  return false;
}

/**
 * Click the first matching Workday skill option in the open prompt list.
 * @param {Document} doc
 * @param {string} skill
 * @returns {Promise<boolean>}
 */
async function clickFirstWorkdaySkillOption(doc, skill) {
  const list = doc.querySelector('[data-automation-id="activeListContainer"][role="listbox"]');
  if (!(list instanceof HTMLElement)) return false;

  const wanted = normText(String(skill || ''));
  const menuItems = Array.from(list.querySelectorAll('[data-automation-id="menuItem"][role="option"]'));

  /**
   * @param {Element} node
   */
  const clickNode = async (node) => {
    if (!(node instanceof HTMLElement)) return false;
    node.scrollIntoView({ block: 'nearest' });
    node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    node.click();
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    // Workday sometimes only commits when clicking the inner checkbox/leaf node.
    const innerLeaf = node.querySelector('[data-automation-id="promptLeafNode"]');
    const innerCheckbox = node.querySelector('[data-automation-id="checkboxPanel"]');
    if (innerLeaf instanceof HTMLElement) innerLeaf.click();
    if (innerCheckbox instanceof HTMLElement) innerCheckbox.click();

    // Also confirm the highlighted option via keyboard as a fallback.
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    list.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    await sleep(60);
    return true;
  };

  const exactMenuItem = menuItems.find((item) => {
    const idText = normText((item.getAttribute('id') || '').replace(/^menuitem-?/i, ''));
    const ariaLabel = normText((item.getAttribute('aria-label') || '').replace(/\s+not\s+checked.*$/i, '').trim());
    const labelNode = item.querySelector('[data-automation-id="promptOption"]');
    const optionLabel = normText(
      (labelNode?.getAttribute('data-automation-label') || labelNode?.textContent || '').trim()
    );

    return (
      (wanted && (idText === wanted || ariaLabel === wanted || optionLabel === wanted)) ||
      (wanted && (idText.startsWith(`${wanted} `) || ariaLabel.startsWith(`${wanted} `) || optionLabel.startsWith(`${wanted} `)))
    );
  });
  if (exactMenuItem) return clickNode(exactMenuItem);

  const firstItem = menuItems[0];
  if (firstItem) return clickNode(firstItem);

  const firstPromptOption = list.querySelector('[data-automation-id="promptOption"]');
  if (firstPromptOption instanceof HTMLElement) return clickNode(firstPromptOption);

  return false;
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
