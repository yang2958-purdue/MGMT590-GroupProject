/**
 * Multi-select tag input component.
 * User types a value and presses Enter or comma to add it as a tag chip.
 * Tags can be removed by clicking the x button.
 *
 * @param {HTMLElement} container - The element to render the tag input into.
 * @param {Object} options
 * @param {string} options.storageKey - Identifier for this tag input instance.
 * @param {string} [options.placeholder] - Input placeholder text.
 */
export function createTagInput(container, { storageKey, placeholder = 'Type and press Enter...' } = {}) {
  const tags = [];

  container.innerHTML = `
    <div class="card" style="padding:8px;">
      <div id="tags-${storageKey}" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px;"></div>
      <input type="text" placeholder="${placeholder}"
             style="border:none; background:transparent; outline:none; width:100%; padding:4px; color:var(--color-text); font-size:13px;" />
    </div>
  `;

  const tagsEl = container.querySelector(`#tags-${storageKey}`);
  const input = container.querySelector('input');

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
    const trimmed = value.replace(/,/g, '').trim();
    if (trimmed && !tags.includes(trimmed)) {
      tags.push(trimmed);
      renderTags();
    }
    input.value = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.value.trim()) addTag(input.value);
    }
    if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      renderTags();
    }
  });

  /**
   * Get the current list of tags.
   * @returns {string[]}
   */
  container._getTags = () => [...tags];
}
