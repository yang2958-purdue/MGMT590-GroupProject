/**
 * Autofill control page (#/autofill).
 *
 * User navigates to the external application site in a normal tab, then opens
 * this page and presses "Autofill this tab" to run the pipeline on the active tab.
 */

import { createAutofillPanel, updateAutofillPanel } from '../components/autofillPanel.js';
import { getAutofillState, getSelectedJob } from '../../modules/storage.js';
import {
  startAutofillOnActiveTab,
  resumeAutofill,
  skipField,
  pauseAutofill,
} from '../../modules/autofill/autofillController.js';

/**
 * @returns {Promise<chrome.tabs.Tab | undefined>}
 */
async function queryActiveTab() {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  return tabs[0];
}

/**
 * @param {HTMLElement} container
 */
export async function renderAutofillPage(container) {
  container.innerHTML = `
    <h1>Autofill</h1>
    <p class="text-muted mt-8">
      Open the job application in a browser tab (e.g. Workday, Greenhouse). Keep that tab focused, then run autofill here.
    </p>
    <div id="job-context" class="mt-12 text-sm text-muted" style="display:none;"></div>
    <div id="active-tab-card" class="card mt-12" style="padding:12px;">
      <p style="font-weight:600; margin-bottom:8px;">Active tab</p>
      <p id="active-tab-title" class="text-sm" style="word-break:break-word;">—</p>
      <p id="active-tab-url" class="text-muted text-sm mt-8" style="word-break:break-all;">—</p>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button type="button" id="btn-refresh-tab" class="btn btn-sm">Refresh</button>
        <button type="button" id="btn-autofill-tab" class="btn btn-primary btn-sm">Autofill this tab</button>
      </div>
      <p id="autofill-start-error" class="text-sm mt-8" style="color:var(--color-danger); display:none;"></p>
    </div>
    <div id="autofill-panel" class="mt-16"></div>
    <button id="btn-back-results" class="btn mt-16" style="width:100%;">
      &larr; Back to Results
    </button>
  `;

  const panelEl = container.querySelector('#autofill-panel');
  const errEl = container.querySelector('#autofill-start-error');
  const btnAutofill = container.querySelector('#btn-autofill-tab');
  const btnRefresh = container.querySelector('#btn-refresh-tab');

  const job = await getSelectedJob();
  const jobCtx = container.querySelector('#job-context');
  if (job?.title || job?.company) {
    jobCtx.style.display = 'block';
    jobCtx.textContent = `From your list: ${job.title || 'Job'}${job.company ? ` · ${job.company}` : ''}`;
  }

  async function refreshTabPreview() {
    const tab = await queryActiveTab();
    container.querySelector('#active-tab-title').textContent = tab?.title || '—';
    container.querySelector('#active-tab-url').textContent = tab?.url || '—';
  }

  await refreshTabPreview();

  const state = await getAutofillState();
  /** @type {number | null} */
  let controlTabId = state?.tabId ?? null;

  createAutofillPanel(panelEl, {
    onPause: () => controlTabId != null && pauseAutofill(controlTabId),
    onResume: () => controlTabId != null && resumeAutofill(controlTabId),
    onSkip: () => controlTabId != null && skipField(controlTabId),
  });

  if (state) {
    updateAutofillPanel(panelEl, state);
  }

  async function onMessage(message) {
    // Preserve skippedRequired data from the stored state across all status updates
    const currentState = await getAutofillState();
    
    switch (message.type) {
      case 'AUTOFILL_STATUS':
        updateAutofillPanel(panelEl, {
          status: 'filling',
          filledCount: message.filledCount,
          totalFields: message.totalFields,
          fieldLabel: message.fieldLabel,
          skippedRequired: currentState?.skippedRequired,
        });
        break;

      case 'AUTOFILL_PAUSED':
        updateAutofillPanel(panelEl, {
          status: 'paused',
          filledCount: message.filledCount,
          totalFields: message.totalFields,
          fieldLabel: message.fieldLabel,
          reason: message.reason,
          skippedRequired: currentState?.skippedRequired,
        });
        break;

      case 'AUTOFILL_COMPLETE':
        updateAutofillPanel(panelEl, {
          status: 'complete',
          filledCount: message.filledCount,
          totalFields: message.totalFields,
          skippedRequired: currentState?.skippedRequired,
        });
        break;

      default:
        break;
    }
  }

  chrome.runtime.onMessage.addListener(onMessage);

  btnRefresh.addEventListener('click', () => {
    refreshTabPreview();
  });

  btnAutofill.addEventListener('click', async () => {
    errEl.style.display = 'none';
    errEl.textContent = '';
    btnAutofill.disabled = true;
    btnAutofill.textContent = 'Starting...';
    await refreshTabPreview();

    try {
      const newState = await startAutofillOnActiveTab();
      controlTabId = newState.tabId ?? null;
      updateAutofillPanel(panelEl, newState);
    } catch (e) {
      errEl.textContent = e?.message || String(e);
      errEl.style.display = 'block';
      const st = await getAutofillState();
      if (st?.status === 'error') {
        updateAutofillPanel(panelEl, st);
      }
    } finally {
      btnAutofill.disabled = false;
      btnAutofill.textContent = 'Autofill this tab';
    }
  });

  container.querySelector('#btn-back-results').addEventListener('click', () => {
    chrome.runtime.onMessage.removeListener(onMessage);
    window.location.hash = '#/results';
  });
}
