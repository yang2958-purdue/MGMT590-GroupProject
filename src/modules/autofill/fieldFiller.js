/**
 * Field filler module — runs inside the content script context.
 *
 * Provides sequential field filling with delay, field highlighting,
 * and value injection that triggers framework-friendly change events.
 */

import { abbrToFullStateName } from './usStateAbbrev.js';

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

    // Custom dropdowns (Workday listboxes) need time to commit before the next field steals focus.
    if (field.fieldType === 'select' && i < fields.length - 1) {
      await sleep(320);
    }

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
 * @param {string} raw
 */
function isMobilePhoneDeviceIntent(raw) {
  const t = normText(String(raw || ''));
  if (!t) return false;
  if (t === 'mobile' || t === 'cell' || t === 'cellular') return true;
  return /^mobile(\s+phone)?$/.test(t) || /^cell(\s+phone)?$/.test(t);
}

/**
 * Prefer mobile / cell / cellular options; avoid landline / home / office when possible.
 * @param {HTMLOptionElement[]} opts
 * @returns {HTMLOptionElement|null}
 */
function pickMobileLikeDeviceOption(opts) {
  const cleaned = opts.filter((o) => {
    const t = (o.textContent || '').trim();
    if (!t) return false;
    if (/^select\s+one|^choose|^--$/i.test(t)) return false;
    return true;
  });

  const mobileish = cleaned.filter((o) => /\b(mobile|cell|cellular|wireless)\b/i.test(o.textContent || ''));
  const pool = mobileish.length ? mobileish : cleaned;

  const rank = (text) => {
    const x = (text || '').toLowerCase();
    if (/\blandline\b|\bhome\b|\boffice\b|\bwork\b|\bfax\b|\bpager\b/.test(x)) return 50;
    if (/\bmobile\b/.test(x)) return 0;
    if (/\bcellular\b/.test(x)) return 1;
    if (/\bcell\b/.test(x)) return 2;
    if (/\bwireless\b/.test(x)) return 3;
    return 10;
  };

  pool.sort((a, b) => rank(a.textContent || '') - rank(b.textContent || ''));
  return pool[0] ?? null;
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
  if (m) return m;

  // US state: resume stores "IL" but <option> text is often "Illinois" or "Illinois (United States)"
  const fullState = abbrToFullStateName(raw);
  if (fullState) {
    const fl = fullState.toLowerCase();
    const ab = String(raw).trim().toLowerCase();
    m = opts.find((o) => {
      const t = o.textContent.trim().toLowerCase();
      const v = (o.value || '').toLowerCase();
      return t.includes(fl) || t.includes(`(${ab})`) || v === ab;
    });
    if (m) return m;
  }

  if (isMobilePhoneDeviceIntent(raw)) {
    return pickMobileLikeDeviceOption(opts);
  }

  return null;
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
  const parts = normalized
    .split(/\s*-\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { start: parseSingle(parts[0]), end: parseSingle(parts[1]) };
  }
  return { start: parseSingle(normalized), end: null };
}

/**
 * Rich text / ARIA textbox (not native textarea element).
 * @param {HTMLElement} el
 * @param {string} value
 */
function setContentEditableOrTextboxValue(el, value) {
  const text = String(value ?? '');
  el.focus();
  el.textContent = text;
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Workday sometimes uses one MM/YYYY text field instead of split month/year inputs.
 * @param {Element} el
 * @returns {boolean}
 */
function isWorkdayMonthYearCombinedInput(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const id = (el.id || '').toLowerCase();
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  const ph = (el.getAttribute('placeholder') || '').toLowerCase();
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  if (id.includes('datesectionmonth-input') || id.includes('datesectionyear-input')) return false;
  const inWx =
    id.includes('workexperience') ||
    aid.includes('workexperience') ||
    id.includes('fromdate') ||
    id.includes('todate') ||
    aid.includes('fromdate') ||
    aid.includes('todate');
  if (!inWx) return false;
  const type = (el.type || '').toLowerCase();
  const textLike = type === 'text' || type === '' || type === 'tel';
  const looksMM =
    (ph.includes('mm') && ph.includes('yyyy')) ||
    ph.includes('m/yyyy') ||
    ph.includes('mm/yyyy') ||
    aria.includes('mm/yyyy');
  const looksDateish = looksMM || ph.includes('date') || aria.includes('date');
  return textLike && looksDateish;
}

/**
 * @param {HTMLInputElement} el
 * @param {string} value
 */
function setWorkdayMonthYearCombinedValue(el, value) {
  const rawDates = String(value || '');
  const parsed = parseDateRange(rawDates);
  const id = (el.id || '').toLowerCase();
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  const wantsEnd =
    id.includes('to') || id.includes('end') || aid.includes('todate') || aid.includes('enddate');
  if (wantsEnd && !parsed.end && /\b(present|current|now)\b/i.test(rawDates)) {
    return;
  }
  const target = wantsEnd ? parsed.end || parsed.start : parsed.start || parsed.end;
  if (!target) return;
  const mmYYYY = `${target.month}/${target.year}`;
  el.focus();
  el.value = mmYYYY;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * @param {HTMLTextAreaElement} el
 * @param {string} value
 */
function fillNativeTextarea(el, value) {
  const v = String(value ?? '');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) setter.call(el, v);
  else el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Workday often hides the real checkbox; React/Vue need a real click, not only `.checked =`.
 * @param {Element} el
 * @param {string} value
 */
function setWorkdayCheckboxValue(el, value) {
  const want = value === 'true' || value === '1' || /^yes$/i.test(String(value));
  let input =
    el instanceof HTMLInputElement && el.type === 'checkbox'
      ? el
      : el.querySelector?.('input[type="checkbox"]');
  if (!input && el instanceof HTMLElement) {
    input = el.parentElement?.querySelector?.('input[type="checkbox"]');
  }
  if (!(input instanceof HTMLInputElement)) {
    if ((el.getAttribute('role') || '').toLowerCase() === 'checkbox') {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    return;
  }
  if (input.checked !== want) {
    const doc = input.ownerDocument;
    if (input.id) {
      const esc =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(input.id)
          : escapeAttr(input.id);
      const lbl = doc.querySelector(`label[for="${esc}"]`);
      if (lbl instanceof HTMLElement) {
        lbl.click();
      }
      if (input.checked !== want) {
        input.focus();
        input.click();
      }
    } else {
      input.focus();
      input.click();
    }
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
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

  const innerTextarea =
    el instanceof HTMLTextAreaElement ? el : el.querySelector?.('textarea');
  if (fieldType === 'textarea' && innerTextarea instanceof HTMLTextAreaElement) {
    fillNativeTextarea(innerTextarea, value);
    return;
  }
  if (
    fieldType === 'select' &&
    innerTextarea instanceof HTMLTextAreaElement &&
    String(value).length > 80
  ) {
    fillNativeTextarea(innerTextarea, value);
    return;
  }

  if (el instanceof HTMLElement && el.isContentEditable) {
    setContentEditableOrTextboxValue(el, value);
    return;
  }
  const r = (el.getAttribute('role') || '').toLowerCase();
  if (r === 'textbox' && !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    setContentEditableOrTextboxValue(el, value);
    return;
  }

  if (isWorkdayMonthYearCombinedInput(el)) {
    setWorkdayMonthYearCombinedValue(el, value);
    return;
  }

  if (isWorkdayDateSectionInput(el)) {
    setWorkdayDateSectionValue(el, value);
    return;
  }

  if (isWorkdaySkillsInput(el)) {
    await setWorkdaySkillsInputValue(el, value);
    return;
  }

  if (isWorkdayEducationDegreeControl(el)) {
    await setWorkdayEducationDegreeValue(el, value);
    return;
  }

  if (isWorkdayEducationFieldOfStudyControl(el)) {
    await setWorkdayEducationFieldOfStudyValue(el, value);
    return;
  }

  if (fieldType === 'select') {
    await setAnyDropdownValue(el, value);
    return;
  }

  if (fieldType === 'checkbox' || (el instanceof HTMLInputElement && el.type === 'checkbox')) {
    setWorkdayCheckboxValue(el, value);
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
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  const h = `${id} ${aid}`;
  if (h.includes('datesectionmonth') || h.includes('datesectionyear')) return true;
  if (h.includes('datesection') && (h.includes('month') || h.includes('year'))) return true;
  const wx =
    h.includes('workexperience') &&
    (h.includes('from') || h.includes('to') || h.includes('start') || h.includes('end'));
  if (wx && (h.includes('month') || h.includes('year'))) return true;
  return false;
}

/**
 * Workday skills control is a searchable multi-select input.
 * @param {Element} el
 */
function isWorkdaySkillsInput(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const id = (el.id || '').toLowerCase();
  const name = (el.getAttribute('name') || '').toLowerCase();
  const ph = (el.getAttribute('placeholder') || '').toLowerCase();
  const auto = (el.getAttribute('data-automation-id') || '').toLowerCase();
  if (id.includes('skills--skills') || name === 'skills') return true;
  if (ph.includes('skill') && (ph.includes('add') || ph.includes('type'))) return true;
  if (auto.includes('skill') && (auto.includes('multiselect') || auto.includes('prompt'))) return true;
  return false;
}

/**
 * Workday education degree is usually a button-triggered listbox.
 * @param {Element} el
 */
function isWorkdayEducationDegreeControl(el) {
  if (!(el instanceof HTMLElement)) return false;
  const id = (el.getAttribute('id') || '').toLowerCase();
  if (/^education-\d+--degree$/.test(id)) return true;
  const degreeBtn = el.querySelector?.('button[id^="education-"][id$="--degree"][aria-haspopup="listbox"]');
  return !!degreeBtn;
}

/**
 * Workday field of study is a searchable multiselect input.
 * @param {Element} el
 */
function isWorkdayEducationFieldOfStudyControl(el) {
  if (!(el instanceof HTMLElement)) return false;
  const id = (el.getAttribute('id') || '').toLowerCase();
  if (/^education-\d+--fieldofstudy$/.test(id)) return true;
  const fosInput = el.querySelector?.('input[id^="education-"][id$="--fieldOfStudy"]');
  return !!fosInput;
}

/**
 * Parsed segment for Work Experience From/To month-year inputs and matching listboxes.
 * @param {Element} el
 * @param {string} rawDates
 * @returns {{ nextValue: string, wantsEnd: boolean, isYearField: boolean, isMonthField: boolean, wantsMonth: boolean, target: { month: string, year: string }, id: string } | null}
 */
function getWorkdayExpDateTarget(el, rawDates) {
  const parsed = parseDateRange(String(rawDates || ''));
  const id = (el.id || '').toLowerCase();
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  const wantsEnd =
    id.includes('enddate') ||
    id.includes('todate') ||
    aid.includes('todate') ||
    aid.includes('enddate') ||
    (id.includes('to') && !id.includes('from'));
  const h = `${id} ${aid}`;
  const isYearField =
    h.includes('datesectionyear') ||
    h.includes('year-input') ||
    (h.includes('year') && !h.includes('month'));
  const isMonthField =
    h.includes('datesectionmonth') ||
    h.includes('month-input') ||
    (h.includes('month') && !h.includes('year'));
  if (wantsEnd && !parsed.end && /\b(present|current|now)\b/i.test(String(rawDates))) {
    return null;
  }
  const target = wantsEnd ? parsed.end || parsed.start : parsed.start || parsed.end;
  if (!target) return null;

  const wantsMonth = id.includes('datesectionmonth') || id.includes('month-input');
  let nextValue;
  if (isYearField) nextValue = target.year;
  else if (isMonthField) nextValue = target.month;
  else nextValue = wantsMonth ? target.month : target.year;
  if (!nextValue) return null;
  return { nextValue, wantsEnd, isYearField, isMonthField, wantsMonth, target, id };
}

/**
 * Fill Workday split date inputs from a combined date/range string.
 * @param {HTMLInputElement} el
 * @param {string} value
 */
function setWorkdayDateSectionValue(el, value) {
  const rawDates = String(value || '');
  const seg = getWorkdayExpDateTarget(el, rawDates);
  if (!seg) return;
  const { nextValue } = seg;

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
    .slice(0, 24);
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
    if (!(await clickWorkdayPromptOptionByToken(el.ownerDocument, skill))) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await sleep(80);
      await clickWorkdayPromptOptionByToken(el.ownerDocument, skill);
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
      await clickWorkdayPromptOptionByToken(el.ownerDocument, skill);
      const fallbackOption = findCustomDropdownOption(el.ownerDocument, skill);
      if (fallbackOption) fallbackOption.click();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      await waitForSkillCommitted(el, skill, beforeCount, 1200);
    }

    await sleep(200);
  }

  el.dispatchEvent(new Event('change', { bubbles: true }));
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
 * Fill Workday Education Degree (button/listbox style control).
 * @param {Element} el
 * @param {string} value
 */
async function setWorkdayEducationDegreeValue(el, value) {
  const raw = String(value || '').trim();
  if (!raw) return;
  const doc = el.ownerDocument;
  const btn =
    (el instanceof HTMLButtonElement && /^education-\d+--degree$/i.test(el.id || '') && el) ||
    el.querySelector?.('button[id^="education-"][id$="--degree"][aria-haspopup="listbox"]') ||
    el.closest?.('[data-automation-id="formField-degree"]')?.querySelector?.('button[id^="education-"][id$="--degree"]');
  if (!(btn instanceof HTMLElement)) return;

  const beforeText = normText(btn.textContent || '');
  btn.focus();
  btn.click();
  await sleep(120);

  // Workday degree control often has an adjacent search input.
  const searchInput = btn.parentElement?.querySelector('input[type="text"]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.value = raw;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await clickWorkdayPromptOptionByToken(doc, raw);

  // Enter confirm fallback.
  btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  btn.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

  await waitForWorkdayDegreeCommitted(btn, beforeText, raw, 1300);
  btn.dispatchEvent(new Event('change', { bubbles: true }));
  btn.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Fill Workday Education Field of Study using multiselect semantics.
 * @param {Element} el
 * @param {string} value
 */
async function setWorkdayEducationFieldOfStudyValue(el, value) {
  const input =
    (el instanceof HTMLInputElement && /^education-\d+--fieldofstudy$/i.test(el.id || '') && el) ||
    el.querySelector?.('input[id^="education-"][id$="--fieldOfStudy"]');
  if (!(input instanceof HTMLInputElement)) return;

  const tokens = String(value || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!tokens.length) return;

  for (const token of tokens) {
    const beforeCount = getWorkdayMultiSelectCount(input);
    input.focus();
    input.click();
    input.value = token;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await sleep(120);

    await clickWorkdayPromptOptionByToken(input.ownerDocument, token);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    await waitForSkillCommitted(input, token, beforeCount, 1200);
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * Wait for degree button text to reflect a committed choice.
 * @param {HTMLElement} btn
 * @param {string} beforeText
 * @param {string} expected
 * @param {number} timeoutMs
 */
async function waitForWorkdayDegreeCommitted(btn, beforeText, expected, timeoutMs) {
  const end = Date.now() + timeoutMs;
  const want = normText(expected);
  while (Date.now() < end) {
    const now = normText(btn.textContent || '');
    if (now && now !== beforeText && now !== 'select one') return true;
    if (want && now.includes(want)) return true;
    await sleep(80);
  }
  return false;
}

/**
 * Click the best matching Workday prompt option in the open list.
 * @param {Document} doc
 * @param {string} token
 * @param {{ allowFallback?: boolean }} [options] - If allowFallback is false, do not click the first row when no exact match (avoids wrong state/device selection).
 * @returns {Promise<boolean>}
 */
async function clickWorkdayPromptOptionByToken(doc, token, options = {}) {
  const { allowFallback = true } = options;
  const list = doc.querySelector('[data-automation-id="activeListContainer"][role="listbox"]');
  if (!(list instanceof HTMLElement)) return false;

  const wanted = normText(String(token || ''));
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
    await sleep(120);
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

  if (!allowFallback) return false;

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
  // Workday sometimes marks rich text / description areas with combobox ARIA; never treat real textareas as dropdowns.
  if (el instanceof HTMLTextAreaElement) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return false;
  const role = (el.getAttribute('role') || '').toLowerCase();
  if (role === 'textbox' && !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return false;
  }
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
const MOBILE_DEVICE_SEARCH_VARIANTS = [
  'Mobile',
  'Cell',
  'Cellular',
  'Mobile Phone',
  'Cell Phone',
  'Wireless',
  'Wireless Phone',
];

/**
 * @param {string} raw
 * @returns {string[]}
 */
function expandStateSearchTokens(raw) {
  const full = abbrToFullStateName(raw);
  if (!full) return [];
  return [full, String(raw).trim()];
}

const _MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const _MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Workday month listboxes often match "August" / "8", not the resume token "08/2020".
 * @param {string} s
 * @returns {string[]|null}
 */
function expandMonthYearComboboxTokens(s) {
  const t = String(s ?? '').trim();
  const m = t.match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const mm = Math.min(12, Math.max(1, parseInt(m[1], 10)));
  const pad = String(mm).padStart(2, '0');
  const yy = m[2];
  const idx = mm - 1;
  const longN = _MONTH_LONG[idx];
  const shortN = _MONTH_SHORT[idx];
  return [...new Set([longN, shortN, pad, String(mm), `${pad}/${yy}`, t])];
}

/**
 * @param {Element} el
 */
function workdayWxDateHaystack(el) {
  if (!(el instanceof HTMLElement)) return '';
  const id = (el.id || '').toLowerCase();
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  return `${id} ${aid} ${aria}`;
}

/**
 * Work Experience "month" listbox (not year): needs name tokens, not raw MM/YYYY only.
 * @param {Element} el
 */
function isWorkdayWxMonthDropdown(el) {
  const h = workdayWxDateHaystack(el);
  const compact = h.replace(/[^a-z0-9]+/g, '');
  const wx =
    compact.includes('workexperience') || h.includes('fromdate') || h.includes('todate');
  if (!wx) return false;
  if (h.includes('datesectionyear') && !h.includes('datesectionmonth')) return false;
  return (
    h.includes('datesectionmonth') ||
    h.includes('month-input') ||
    (/\bmonth\b/.test(h) && !/\byear\b/.test(h) && !h.includes('datesectionyear'))
  );
}

/**
 * @param {Element} el
 */
function isWorkdayWxYearDropdown(el) {
  const h = workdayWxDateHaystack(el);
  const compact = h.replace(/[^a-z0-9]+/g, '');
  const wx =
    compact.includes('workexperience') || h.includes('fromdate') || h.includes('todate');
  if (!wx) return false;
  if (h.includes('datesectionmonth') && !h.includes('datesectionyear')) return false;
  return (
    h.includes('datesectionyear') ||
    h.includes('year-input') ||
    (/\byear\b/.test(h) && !/\bmonth\b/.test(h) && !h.includes('datesectionmonth'))
  );
}

/**
 * Tokens to try for custom dropdowns (Workday listboxes): mobile synonyms or state full names.
 * @param {string} raw
 * @param {Element} [el] trigger for Work Experience month/year listbox token shaping
 * @returns {string[]}
 */
function buildComboboxSearchTokens(raw, el) {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  if (isMobilePhoneDeviceIntent(s)) {
    return [...new Set([s, ...MOBILE_DEVICE_SEARCH_VARIANTS])];
  }
  const st = expandStateSearchTokens(s);
  if (st.length) return [...new Set(st)];

  if (el instanceof HTMLElement) {
    if (isWorkdayWxMonthDropdown(el)) {
      const seg = getWorkdayExpDateTarget(el, s);
      if (seg?.target) {
        const my = expandMonthYearComboboxTokens(`${seg.target.month}/${seg.target.year}`);
        if (my?.length) {
          return my;
        }
      }
    }
    if (isWorkdayWxYearDropdown(el)) {
      const seg = getWorkdayExpDateTarget(el, s);
      if (seg?.nextValue) {
        return [String(seg.nextValue)];
      }
    }
  }
  return [s];
}

/**
 * Wait until Workday's open listbox is gone or not visible (commit finished).
 * @param {Document} doc
 */
async function waitForWorkdayListboxToSettle(doc) {
  for (let i = 0; i < 60; i++) {
    const list = doc.querySelector('[data-automation-id="activeListContainer"][role="listbox"]');
    if (!list || !list.isConnected) return;
    const hidden =
      list.getAttribute('aria-hidden') === 'true' || list.getAttribute('hidden') !== null;
    const r = list.getBoundingClientRect();
    if (hidden || r.width < 2 || r.height < 2) return;
    await sleep(40);
  }
}

async function setComboboxValue(el, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return;

  /**
   * Do not dispatch synthetic input/change on the trigger after picking an option — Workday/React
   * may treat that as a new edit and revert the committed value. Refocus, wait for the listbox to
   * close, then pause so framework state can settle before the next field runs.
   */
  const settleSelection = async () => {
    if (el instanceof HTMLElement) {
      el.focus();
    }
    await waitForWorkdayListboxToSettle(el.ownerDocument);
    await sleep(350);
  };

  const openDropdown = () => {
    if (!(el instanceof HTMLElement)) return;
    el.focus();
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.click();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  };

  const searchTokens = buildComboboxSearchTokens(raw, el);

  for (const token of searchTokens) {
    openDropdown();

    if (el instanceof HTMLInputElement && !el.readOnly) {
      el.value = token;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    for (let i = 0; i < 10; i++) {
      const option = findCustomDropdownOption(el.ownerDocument, token);
      if (option) {
        option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        option.click();
        option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        await settleSelection();
        return;
      }
      if (await clickWorkdayPromptOptionByToken(el.ownerDocument, token, { allowFallback: false })) {
        await settleSelection();
        return;
      }
      if (i === 3 || i === 6) openDropdown();
      await sleep(120);
    }
  }
}

/**
 * @param {Document} doc
 * @param {string} raw
 * @returns {HTMLElement|null}
 */
function findCustomDropdownOption(doc, raw) {
  const low = normText(raw);
  // Prefer the open listbox so we do not match a stale option node elsewhere in the DOM.
  const scope =
    doc.querySelector('[data-automation-id="activeListContainer"]') ||
    doc.querySelector('[role="listbox"][aria-expanded="true"]') ||
    doc.body;
  const candidates = Array.from(
    scope.querySelectorAll(
      '[role="option"],[data-automation-id="menuItem"][role="option"],li[role="option"]'
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

// ─── Workday repeaters (Add Work Experience / Add Education) ───

/**
 * Depth-first walk including open shadow roots (Workday often nests controls in shadow DOM).
 * @param {Document|Element|ShadowRoot} root
 * @returns {Generator<Element>}
 */
function* allElementsDeep(root) {
  const start =
    root instanceof Document
      ? root.documentElement
      : root instanceof ShadowRoot
        ? root
        : root;
  if (!start) return;
  const stack = [start];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node instanceof Element) {
      yield node;
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
      if (node.shadowRoot) {
        for (let i = node.shadowRoot.children.length - 1; i >= 0; i--) {
          stack.push(node.shadowRoot.children[i]);
        }
      }
    }
  }
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isLikelyVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  const st = getComputedStyle(el);
  if (st.display === 'none' || st.visibility === 'hidden' || st.pointerEvents === 'none') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function looksLikeAddControl(el) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag !== 'BUTTON' && el.getAttribute('role') !== 'button') {
    if (tag !== 'A') return false;
  }
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  if (aid.includes('addrow') || aid.includes('add-row') || aid.includes('addanother')) return true;
  const lab = (el.getAttribute('aria-label') || '').trim().toLowerCase();
  if (/^add(\s|$|\.)/.test(lab) || /\badd\s+(another|more|row|work|job|education|school|schools)\b/.test(lab)) {
    return true;
  }
  const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return txt === 'add' || /^add\s/.test(txt);
}

/**
 * @param {HTMLElement} btn
 * @param {RegExp} headingRe
 * @returns {boolean}
 */
function ancestorBlockMatchesHeading(btn, headingRe) {
  let node = btn.parentElement;
  for (let depth = 0; depth < 16 && node; depth++, node = node.parentElement) {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > 2200) continue;
    if (headingRe.test(text)) return true;
  }
  return false;
}

/**
 * @param {Document|Element|ShadowRoot} root
 * @returns {HTMLElement[]}
 */
function collectAddButtonsDeep(root) {
  const out = [];
  for (const el of allElementsDeep(root)) {
    if (!(el instanceof HTMLElement)) continue;
    if (!looksLikeAddControl(el)) continue;
    if (!isLikelyVisible(el)) continue;
    out.push(el);
  }
  return out;
}

/**
 * @param {Element} el
 * @returns {boolean}
 */
function isLikelySectionHeading(el) {
  if (!(el instanceof Element)) return false;
  if (/^H[1-4]$/i.test(el.tagName) || el.tagName === 'LEGEND' || el.getAttribute('role') === 'heading') {
    return true;
  }
  const aid = (el.getAttribute('data-automation-id') || '').toLowerCase();
  if (aid.includes('subtitle')) return false;
  return /\b(title|heading)\b/.test(aid) || aid.includes('widgetheader');
}

/**
 * @param {HTMLElement} el
 */
function dispatchClick(el) {
  el.focus();
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.click();
}

/**
 * Click "Add" in Work Experience / Education sections so `workExperience-0--*` and
 * `education-0--*` fields exist before autofill mapping runs.
 * @param {Document} root
 * @param {RegExp} headingRe
 * @param {WeakSet<HTMLElement>} used
 */
async function clickAddNearHeading(root, headingRe, used) {
  const candidates = collectAddButtonsDeep(root).filter((b) => !used.has(b));
  for (const btn of candidates) {
    if (ancestorBlockMatchesHeading(btn, headingRe)) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      dispatchClick(btn);
      used.add(btn);
      await sleep(650);
      return;
    }
  }

  for (const h of allElementsDeep(root)) {
    if (!(h instanceof Element)) continue;
    if (!isLikelySectionHeading(h)) continue;
    const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
    if (!headingRe.test(text)) continue;
    let section = h.closest('section') || h.closest('[role="region"]') || h.closest('fieldset') || h.parentElement;
    for (let depth = 0; depth < 16 && section; depth++, section = section.parentElement) {
      const innerBtns = section.querySelectorAll(
        'button, [role="button"], a[href], div[role="button"]',
      );
      for (const btn of innerBtns) {
        if (!(btn instanceof HTMLElement)) continue;
        if (!looksLikeAddControl(btn) || !isLikelyVisible(btn)) continue;
        if (used.has(btn)) continue;
        btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        dispatchClick(btn);
        used.add(btn);
        await sleep(650);
        return;
      }
    }
  }
}

/**
 * Count distinct Workday workExperience-<N> repeater ids in the DOM (shadow DOM included).
 * @param {Document|Element|ShadowRoot} root
 * @returns {number}
 */
function countWorkExperienceRowsInRoot(root) {
  const ids = new Set();
  for (const el of allElementsDeep(root)) {
    if (!(el instanceof Element)) continue;
    const blob = [
      el.id,
      el.getAttribute('name'),
      el.getAttribute('data-automation-id'),
      el.getAttribute('aria-label'),
    ]
      .filter(Boolean)
      .join(' ');
    const compact = blob.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const re = /workexperience(\d+)/g;
    let m;
    while ((m = re.exec(compact)) !== null) {
      ids.add(parseInt(m[1], 10));
    }
  }
  return ids.size;
}

/**
 * @param {Document} root
 * @param {number} workExperienceTargetCount - Desired number of Work Experience rows (capped by caller).
 * @param {boolean} educationAdd - Click Education "Add" once when true.
 */
async function ensureWorkdayRepeatersInRoot(root, workExperienceTargetCount, educationAdd) {
  if (!root?.body) return;
  const cap = Math.min(Math.max(workExperienceTargetCount, 0), 10);
  if (cap > 0) {
    const existing = countWorkExperienceRowsInRoot(root);
    const need = Math.max(0, cap - existing);
    for (let i = 0; i < need; i++) {
      await clickAddNearHeading(
        root,
        /work\s*experience|employment\s*history|professional\s*experience/i,
        new WeakSet(),
      );
    }
  }
  if (educationAdd) {
    await clickAddNearHeading(
      root,
      /(^|\s)(education|academic\s*history|schools?\s*attended)(\s|$)/i,
      new WeakSet(),
    );
  }
}

/**
 * All same-origin documents reachable from `document` (nested iframes included).
 * @returns {Document[]}
 */
function collectSameOriginDocuments() {
  const out = [];
  const seen = new Set();
  const queue = [document];
  while (queue.length) {
    const doc = queue.shift();
    if (!doc || seen.has(doc)) continue;
    seen.add(doc);
    out.push(doc);
    try {
      doc.querySelectorAll('iframe').forEach((fr) => {
        try {
          if (fr.contentDocument) queue.push(fr.contentDocument);
        } catch {
          /* cross-origin */
        }
      });
    } catch {
      /* ignore */
    }
  }
  return out;
}

/**
 * Clicks Workday "Add" row controls for Experience/Education in the main document and same-origin iframes.
 * Call from the content script before a fresh DOM field scan.
 *
 * @param {Object} [opts]
 * @param {number} [opts.workExperienceTargetCount] - Number of Work Experience rows to ensure (default 1).
 * @param {boolean} [opts.educationAdd] - Also add one Education row (default true).
 */
export async function prepareWorkdayRepeatersForAutofill(opts = {}) {
  const wxTarget =
    typeof opts.workExperienceTargetCount === 'number' && !Number.isNaN(opts.workExperienceTargetCount)
      ? opts.workExperienceTargetCount
      : 1;
  const educationAdd = opts.educationAdd !== false;
  for (const root of collectSameOriginDocuments()) {
    await ensureWorkdayRepeatersInRoot(root, wxTarget, educationAdd);
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendStatus(type, data) {
  chrome.runtime.sendMessage({ type, ...data });
}
