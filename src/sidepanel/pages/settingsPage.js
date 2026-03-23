/**
 * Render the settings page.
 * Shows user profile Q&A fields, server connection status,
 * and configuration options.
 * @param {HTMLElement} container - The main content element to render into.
 */
export function renderSettingsPage(container) {
  container.innerHTML = `
    <h1>Settings</h1>
    <p class="text-muted mt-8">Configure your profile and connection settings.</p>

    <div class="card mt-16">
      <h3>Scraper Server</h3>
      <p class="text-muted text-sm mt-8">
        The local Python server at <code>localhost:5001</code> provides job scraping.
      </p>
      <div id="server-status" class="mt-8">
        <span class="badge badge-amber">Checking...</span>
      </div>
    </div>

    <div class="card mt-16">
      <h3>User Profile</h3>
      <p class="text-muted text-sm mt-8">
        Pre-fill answers for common application questions.
      </p>
      <div class="mt-12">
        <label>Citizenship Status</label>
        <input type="text" id="citizenship" placeholder="e.g. US Citizen" />
      </div>
      <div class="mt-12">
        <label>Sponsorship Needed</label>
        <select id="sponsorship">
          <option value="">-- Select --</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
      <div class="mt-12">
        <label>Desired Salary</label>
        <input type="text" id="desired-salary" placeholder="e.g. $80,000" />
      </div>
      <button id="btn-save-profile" class="btn btn-primary mt-12">Save Profile</button>
    </div>
  `;
}
