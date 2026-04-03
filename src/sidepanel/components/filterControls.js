/**
 * Filter controls component for job search criteria.
 * Includes: salary range, location, experience level, remote/onsite toggle.
 * Exposes a _getFilters() method on the container element for the search button.
 *
 * @param {HTMLElement} container - The element to render the controls into.
 */
export function createFilterControls(container) {
  container.innerHTML = `
    <div class="card">
      <h3 class="mb-12">Filters</h3>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label>Min Salary</label>
          <input type="number" id="salary-min" placeholder="e.g. 60000" />
        </div>
        <div>
          <label>Max Salary</label>
          <input type="number" id="salary-max" placeholder="e.g. 120000" />
        </div>
      </div>

      <div class="mt-12">
        <label>Location</label>
        <input type="text" id="filter-location" placeholder="e.g. San Francisco, CA" />
      </div>

      <div class="mt-12">
        <label>Experience Level</label>
        <select id="filter-experience">
          <option value="">Any</option>
          <option value="entry">Entry Level</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior Level</option>
          <option value="lead">Lead / Principal</option>
        </select>
      </div>

      <div class="mt-12" style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="filter-remote" />
        <label for="filter-remote" style="margin:0; text-transform:none; font-weight:400; font-size:13px;">
          Remote only
        </label>
      </div>
    </div>
  `;

  /**
   * Get the current filter values.
   * @returns {Object}
   */
  container._getFilters = () => ({
    salaryMin: Number(container.querySelector('#salary-min').value) || undefined,
    salaryMax: Number(container.querySelector('#salary-max').value) || undefined,
    location: container.querySelector('#filter-location').value.trim() || undefined,
    experienceLevel: container.querySelector('#filter-experience').value || undefined,
    remote: container.querySelector('#filter-remote').checked || undefined,
  });
}
