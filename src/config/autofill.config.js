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
