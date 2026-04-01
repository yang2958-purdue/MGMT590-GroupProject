/**
 * Step navigation bar component.
 * Renders a horizontal step indicator for the pipeline:
 * Upload → Targets → Results → Detail → Autofill → Settings → Debug
 *
 * @param {HTMLElement} container - The nav element to render into.
 * @param {string} activeHash - The current route hash (e.g. '#/upload').
 */
export function renderNav(container, activeHash) {
  const steps = [
    { hash: '#/upload', label: 'Upload' },
    { hash: '#/target', label: 'Targets' },
    { hash: '#/results', label: 'Results' },
    { hash: '#/detail', label: 'Detail' },
    { hash: '#/autofill', label: 'Autofill' },
    { hash: '#/settings', label: 'Settings' },
    { hash: '#/debug', label: 'Debug' },
  ];

  container.innerHTML = `
    <div style="display:flex; align-items:center; padding:10px 16px; gap:4px;">
      <strong style="margin-right:12px; font-size:15px; white-space:nowrap;">JobBot</strong>
      ${steps
        .map(
          (s) => `
        <a href="${s.hash}"
           style="
             padding:6px 10px;
             border-radius:6px;
             font-size:12px;
             font-weight:500;
             text-decoration:none;
             color:${activeHash === s.hash ? '#fff' : 'var(--color-text-muted)'};
             background:${activeHash === s.hash ? 'var(--color-primary)' : 'transparent'};
             transition: background 0.15s;
           "
        >${s.label}</a>
      `
        )
        .join('')}
    </div>
  `;
}
