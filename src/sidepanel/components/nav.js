/**
 * Side panel navigation: icon buttons for the main pipeline plus a "More" menu
 * (Settings, Debug). Hover tooltips use the native `title` attribute.
 *
 * Primary icons: Remix-style SVG assets in `../icons/` (fill="currentColor").
 *
 * @param {HTMLElement} container - The nav element to render into.
 * @param {string} activeHash - The current route hash (e.g. '#/upload').
 */

import uploadLine from '../icons/upload-line.svg?raw';
import seoLine from '../icons/seo-line.svg?raw';
import folderLine from '../icons/folder-line.svg?raw';
import draftLine from '../icons/draft-line.svg?raw';
import pencilAiLine from '../icons/pencil-ai-line.svg?raw';

/** @param {string} svgRaw - SVG markup from `?raw` import */
function navSvg(svgRaw) {
  return svgRaw.replace(/<svg\s+/, '<svg width="20" height="20" aria-hidden="true" ');
}

const STROKE_ATTR =
  'xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

/** Kept as stroke glyph (no asset provided for "More") */
const ICON_MORE = `<svg ${STROKE_ATTR}><path d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"/></svg>`;

const ICONS = {
  upload: navSvg(uploadLine),
  targets: navSvg(seoLine),
  results: navSvg(folderLine),
  detail: navSvg(draftLine),
  autofill: navSvg(pencilAiLine),
  more: ICON_MORE,
};

const primarySteps = [
  { hash: '#/upload', label: 'Upload', icon: ICONS.upload },
  { hash: '#/target', label: 'Targets', icon: ICONS.targets },
  { hash: '#/results', label: 'Results', icon: ICONS.results },
  { hash: '#/detail', label: 'Detail', icon: ICONS.detail },
  { hash: '#/autofill', label: 'Autofill', icon: ICONS.autofill },
];

const moreSteps = [
  { hash: '#/settings', label: 'Settings' },
  { hash: '#/debug', label: 'Debug' },
];

export function renderNav(container, activeHash) {
  const moreActive = activeHash === '#/settings' || activeHash === '#/debug';

  const primaryHtml = primarySteps
    .map((s) => {
      const active = activeHash === s.hash;
      return `
        <a
          href="${s.hash}"
          class="nav-icon${active ? ' nav-icon--active' : ''}"
          title="${s.label}"
          aria-label="${s.label}"
          ${active ? 'aria-current="page"' : ''}
        >${s.icon}</a>`;
    })
    .join('');

  const moreLinksHtml = moreSteps
    .map(
      (s) => `
        <a class="nav-more-link" href="${s.hash}">${s.label}</a>`
    )
    .join('');

  container.innerHTML = `
    <div class="nav-inner">
      <strong class="nav-brand">JobBot</strong>
      <div class="nav-icons" role="toolbar" aria-label="Main sections">
        ${primaryHtml}
        <details class="nav-more">
          <summary
            class="nav-more-summary${moreActive ? ' nav-icon--active' : ''}"
            title="More options"
            aria-label="More options"
          >${ICONS.more}</summary>
          <div class="nav-more-panel">${moreLinksHtml}</div>
        </details>
      </div>
    </div>
  `;
}
