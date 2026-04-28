/** Delay in ms between filling consecutive form fields. */
export const FILL_DELAY_MS = 400;

/**
 * Field labels matching any of these keywords (case-insensitive substring)
 * will trigger an autofill pause so the user can fill them manually.
 */
export const PAUSE_TRIGGER_KEYWORDS = [
  'essay',
  'cover letter',
  'salary',
  'compensation',
  'expected pay',
  'desired salary',
  'security clearance',
  'nda',
  'work location preference',
];

/**
 * When true, autofill will auto-click Workday "Add" controls for repeaters
 * (work experience / education) before a second DOM scan.
 *
 * Uses target-count guards so it only adds rows up to parsed resume counts.
 */
export const AUTO_EXPAND_WORKDAY_REPEATERS = true;
