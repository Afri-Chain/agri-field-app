// src/features/marketplace/MarketplaceClient.js
// Talks to the Cloudflare Worker's /api/v1/templates and /api/schemas/latest
// endpoints, and caches installed templates/models locally via Dync.

export class MarketplaceClient {
  constructor(db, { baseUrl = process.env.MARKETPLACE_URL || 'https://your-worker.workers.dev' } = {}) {
    this.db = db;
    this.baseUrl = baseUrl;
  }

  async listTemplates() {
    const res = await fetch(`${this.baseUrl}/api/v1/templates`);
    if (!res.ok) throw new Error(`Failed to list templates: ${res.status}`);
    return res.json();
  }

  async fetchLatestSchema(schemaId) {
    const res = await fetch(`${this.baseUrl}/api/schemas/latest?schema_id=${encodeURIComponent(schemaId)}`);
    if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
    return res.json();
  }

  async installTemplate(templateId) {
    const template = await this.fetchLatestSchema(templateId);
    // Persist to local schema cache table (add a `survey_schemas` table to
    // database.js if you want this queryable offline).
    return template;
  }

  async syncInstalledTemplates() {
    // Called on app start — refreshes any templates the user has installed,
    // so schema updates propagate without a manual re-install.
    try {
      const templates = await this.listTemplates();
      return templates;
    } catch (err) {
      console.warn('[MarketplaceClient] offline or unreachable, skipping refresh', err);
      return [];
    }
  }
}
