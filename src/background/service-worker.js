/**
 * JobBot background service worker.
 *
 * Responsibilities:
 * - Open the side panel when the extension action is clicked.
 * - Relay autofill status messages from content scripts to the side panel.
 * - Run job search + scoring in the background so tab switches don't cancel it.
 *
 * The side panel (autofillController.js) handles orchestration directly,
 * so the service worker only forwards content-script messages that the
 * side panel's chrome.runtime.onMessage listener picks up automatically.
 */

import { scrapeJobs } from '../modules/jobScraper.js';
import { extractSkillsLLM } from '../modules/llmSkillExtractor.js';
import { scoreJob } from '../modules/scorer.js';
import {
  getResume,
  setResults,
  setTargets,
  getJobSearchState,
  setJobSearchState,
} from '../modules/storage.js';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('sidePanel.setPanelBehavior failed:', err));

let activeSearchPromise = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'JOB_SEARCH_START') {
    if (activeSearchPromise) {
      sendResponse({ ok: true, alreadyRunning: true });
      return true;
    }

    const criteria = message.criteria || {};
    activeSearchPromise = runJobSearch(criteria)
      .catch((e) => {
        console.error('[JobBot] background search failed', e);
      })
      .finally(() => {
        activeSearchPromise = null;
      });

    sendResponse({ ok: true, started: true });
    return true;
  }

  if (message?.type === 'JOB_SEARCH_STATUS') {
    getJobSearchState()
      .then((state) => sendResponse({ ok: true, state: state || { status: 'idle' } }))
      .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    return true;
  }

  return false;
});

/**
 * @param {Object} criteria
 * @returns {Promise<void>}
 */
async function runJobSearch(criteria) {
  const startedAt = Date.now();
  await setJobSearchState({
    status: 'running',
    startedAt,
    processed: 0,
    total: 0,
  });

  try {
    await setTargets({
      companies: criteria?.companies || [],
      titles: criteria?.titles || [],
      filters: {
        location: criteria?.location || '',
        salaryMin: criteria?.salary_range_min,
        salaryMax: criteria?.salary_range_max,
        experienceLevel: criteria?.experience_level || '',
        remote: !!criteria?.remote,
      },
    });

    const postings = await scrapeJobs(criteria);
    const resume = await getResume();

    let resumeSkills = undefined;
    let resumeExtractFailed = false;
    if (resume) {
      try {
        resumeSkills = await extractSkillsLLM(resume.rawText, 'resume');
      } catch {
        resumeExtractFailed = true;
      }
    }

    const scored = [];
    for (let i = 0; i < postings.length; i++) {
      const posting = postings[i];
      let row;
      if (resume) {
        const scores = await scoreJob(resume, posting, {
          resumeSkills,
          resumeExtractFailed,
        });
        row = { ...posting, ...scores };
      } else {
        row = { ...posting, fitScore: 0, atsScore: 0, matchedKeywords: [], missingKeywords: [] };
      }
      scored.push(row);
      await setJobSearchState({
        status: 'running',
        startedAt,
        processed: i + 1,
        total: postings.length,
      });
    }

    scored.sort((a, b) => b.fitScore - a.fitScore);
    await setResults(scored);

    await setJobSearchState({
      status: 'complete',
      completedAt: Date.now(),
      processed: postings.length,
      total: postings.length,
    });
  } catch (e) {
    await setJobSearchState({
      status: 'error',
      completedAt: Date.now(),
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

// BACKLOG: Metrics tracking (applications sent, time saved)
