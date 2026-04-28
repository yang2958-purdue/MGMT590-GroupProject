/**
 * Shared CSS selectors for discoverable ATS form controls during DOM scans.
 *
 * Workday markup varies across tenants; dropdown triggers are often `<button>`
 * variants with `aria-haspopup` (`listbox`, `dialog`, `menu`). A combined broad
 * selector avoids false “zero fields” scans when narrow patterns miss them.
 */

/** Core primitives (preferred). Omit disabled exclusion — Workday can briefly disable controls during hydration. */
export const DOM_SCAN_CONTROL_SELECTOR_PRIMARY =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]),' +
  'select,textarea,' +
  'button[aria-haspopup="listbox"],' +
  '[role="combobox"],' +
  '[role="radio"],' +
  '[role="radiogroup"]';

/**
 * Extra patterns missed by PRIMARY alone (common on Workday + similar ATS stacks).
 */
export const DOM_SCAN_CONTROL_SELECTOR_WIDE =
  'button[aria-haspopup]:not([aria-haspopup="false"]),' +
  '[role="button"][aria-haspopup],' +
  'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="image"])[data-automation-id],' +
  'textarea[data-automation-id],' +
  'select[data-automation-id]';

export const DOM_SCAN_CONTROL_SELECTOR_BROAD_MATCH =
  `${DOM_SCAN_CONTROL_SELECTOR_PRIMARY},${DOM_SCAN_CONTROL_SELECTOR_WIDE}`;
