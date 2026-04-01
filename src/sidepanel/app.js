import { renderNav } from './components/nav.js';
import { renderUploadPage } from './pages/uploadPage.js';
import { renderTargetPage } from './pages/targetPage.js';
import { renderResultsPage } from './pages/resultsPage.js';
import { renderDetailPage } from './pages/detailPage.js';
import { renderSettingsPage } from './pages/settingsPage.js';
import { renderAutofillPage } from './pages/autofillPage.js';
import { renderDebugPage } from './pages/debugPage.js';

const routes = {
  '#/upload': renderUploadPage,
  '#/target': renderTargetPage,
  '#/results': renderResultsPage,
  '#/detail': renderDetailPage,
  '#/settings': renderSettingsPage,
  '#/autofill': renderAutofillPage,
  '#/debug': renderDebugPage,
};

async function router() {
  const hash = window.location.hash || '#/upload';
  const render = routes[hash] || renderUploadPage;
  const main = document.getElementById('main');
  main.innerHTML = '';
  await Promise.resolve(render(main));
  renderNav(document.getElementById('nav'), hash);
}

window.addEventListener('hashchange', () => {
  void router();
});
window.addEventListener('DOMContentLoaded', () => {
  void router();
});
