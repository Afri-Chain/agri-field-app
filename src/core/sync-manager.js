// src/core/sync-manager.js
// Wraps Dync's sync_queue with priority ordering (1=farmer/plot, 2=survey, 3=media)
// and exponential backoff retry logic.

const MAX_RETRIES = 6;
const BASE_DELAY_MS = 2000; // 2s, doubles each retry, capped at 5 min

export class OfflineSyncManager {
  constructor(db, { pollIntervalMs = 15000 } = {}) {
    this.db = db;
    this.pollIntervalMs = pollIntervalMs;
    this._timer = null;
    this._isSyncing = false;
  }

  startBackgroundSync() {
    if (this._timer) return;
    this._timer = setInterval(() => this.runSyncCycle(), this.pollIntervalMs);
    // Kick off immediately too
    this.runSyncCycle();
  }

  stopBackgroundSync() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  async runSyncCycle() {
    if (this._isSyncing) return;
    this._isSyncing = true;
    try {
      const pending = await this.db
        .query('sync_queue')
        .find({ status: 'PENDING' });

      // priority 1 first (farmer/plot), then 2 (survey), then 3 (media)
      const ordered = pending.sort((a, b) => a.priority - b.priority);

      for (const item of ordered) {
        await this._processItem(item);
      }
    } catch (err) {
      console.error('[SyncManager] cycle failed', err);
    } finally {
      this._isSyncing = false;
    }
  }

  async _processItem(item) {
    if (item.retry_count >= MAX_RETRIES) {
      await this.db.query('sync_queue').update(
        { queue_id: item.queue_id },
        { status: 'FAILED', last_error: 'max_retries_exceeded' }
      );
      return;
    }

    await this.db.query('sync_queue').update(
      { queue_id: item.queue_id },
      { status: 'PROCESSING' }
    );

    try {
      const endpoint = this.db.syncEndpoint || process.env.SYNC_URL;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Type': item.entity_type,
        },
        body: item.payload_json,
      });

      if (!res.ok) throw new Error(`sync_failed_${res.status}`);

      await this.db.query('sync_queue').update(
        { queue_id: item.queue_id },
        { status: 'SYNCED', updated_at: new Date().toISOString() }
      );
      await this.db.query(this._tableForEntity(item.entity_type)).update(
        { [this._idFieldForEntity(item.entity_type)]: item.entity_id },
        { sync_status: 'SYNCED' }
      );
    } catch (err) {
      const delay = Math.min(BASE_DELAY_MS * 2 ** item.retry_count, 5 * 60 * 1000);
      await this.db.query('sync_queue').update(
        { queue_id: item.queue_id },
        {
          status: 'PENDING',
          retry_count: item.retry_count + 1,
          last_error: String(err.message || err),
        }
      );
      // Optional: schedule an earlier retry for this one item after `delay`
      setTimeout(() => this.runSyncCycle(), delay);
    }
  }

  _tableForEntity(entityType) {
    return { FARMER: 'farmers', PLOT: 'plots', SURVEY: 'surveys', MEDIA: 'surveys', SCHEMA: 'survey_schemas' }[entityType];
  }

  _idFieldForEntity(entityType) {
    return { FARMER: 'farmer_id', PLOT: 'plot_id', SURVEY: 'survey_id', MEDIA: 'survey_id', SCHEMA: 'schema_id' }[entityType];
  }
}
