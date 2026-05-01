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
 * When true, autofill auto-clicks Workday-style "Add" controls on **any** host before a second DOM scan.
 * When false, the same behavior still runs automatically on `*.myworkdayjobs.com` URLs when the resume
 * has experience or education (`runAutofillPipeline` + `shouldPrepareWorkdayRepeaters`).
 */
export const AUTO_EXPAND_WORKDAY_REPEATERS = false;
