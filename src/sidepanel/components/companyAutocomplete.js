import companiesList from '../../data/companies.json';

/**
 * Company name input with autocomplete.
 * Loads a static seed list from data/companies.json and provides
 * fuzzy-match suggestions as the user types. Selected companies
 * are added as tag chips. Also allows free-text entry via Enter key.
 *
 * @param {HTMLElement} container - The element to render the input into.
 */
export function createCompanyAutocomplete(container) {
  const tags = [];

  container.innerHTML = `
    <div style="position:relative;">
      <input type="text" id="company-search" placeholder="Type a company name..." autocomplete="off" />
      <div id="company-suggestions"
           style="position:absolute; top:100%; left:0; right:0; z-index:10;
                  background:var(--color-surface); border:1px solid var(--color-border);
                  border-radius:var(--radius); display:none; max-height:160px; overflow-y:auto;">
      </div>
    </div>
    <div id="company-tags" style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;"></div>
  `;

  const input = container.querySelector('#company-search');
  const suggestionsEl = container.querySelector('#company-suggestions');
  const tagsEl = container.querySelector('#company-tags');

  function fuzzyMatch(query) {
    const q = query.toLowerCase();
    return companiesList
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 8);
  }

  function renderTags() {
    tagsEl.innerHTML = tags
      .map(
        (t, i) =>
          `<span class="badge badge-green" style="cursor:pointer;" data-idx="${i}">${t} ×</span>`,
      )
      .join('');
    tagsEl.querySelectorAll('.badge').forEach((el) => {
      el.addEventListener('click', () => {
        tags.splice(Number(el.dataset.idx), 1);
        renderTags();
      });
    });
  }

  function addTag(value) {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      tags.push(trimmed);
      renderTags();
    }
    input.value = '';
    suggestionsEl.style.display = 'none';
  }

  function showSuggestions(matches) {
    if (!matches.length) {
      suggestionsEl.style.display = 'none';
      return;
    }
    suggestionsEl.style.display = 'block';
    suggestionsEl.innerHTML = matches
      .map(
        (m) =>
          `<div style="padding:6px 10px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--color-border);" class="sug-item">${m}</div>`,
      )
      .join('');
    suggestionsEl.querySelectorAll('.sug-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addTag(el.textContent);
      });
    });
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) {
      suggestionsEl.style.display = 'none';
      return;
    }
    showSuggestions(fuzzyMatch(q));
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.value.trim()) addTag(input.value);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { suggestionsEl.style.display = 'none'; }, 150);
  });

  /**
   * Get the current list of selected company tags.
   * @returns {string[]}
   */
  container._getTags = () => [...tags];
}
