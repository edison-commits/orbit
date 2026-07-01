import { getDb } from '@/db/client';

const DEFAULT_CADENCE_KEY = 'default_cadence_days';
const DEFAULT_CADENCE_DEFAULT = 30;
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export const settingsService = {
  getDefaultCadence(): number {
    const db = getDb();
    const row = db.getFirstSync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = ? LIMIT 1;`,
      [DEFAULT_CADENCE_KEY],
    );
    return row ? parseInt(row.value, 10) : DEFAULT_CADENCE_DEFAULT;
  },

  setDefaultCadence(days: number): void {
    const db = getDb();
    db.runSync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [DEFAULT_CADENCE_KEY, String(days)],
    );
  },

  getNotificationsEnabled(): boolean {
    return this.getNotificationsPreference() ?? false;
  },

  getNotificationsPreference(): boolean | null {
    const db = getDb();
    const row = db.getFirstSync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = ? LIMIT 1;`,
      [NOTIFICATIONS_ENABLED_KEY],
    );
    if (!row) return null;
    return row.value === 'true';
  },

  setNotificationsEnabled(enabled: boolean): void {
    const db = getDb();
    db.runSync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false'],
    );
  },

  resetAllData(): void {
    const db = getDb();
    db.runSync(`DELETE FROM interaction_contacts;`);
    db.runSync(`DELETE FROM interactions;`);
    db.runSync(`DELETE FROM imported_contact_sources;`);
    db.runSync(`DELETE FROM contacts;`);
    db.runSync(`DELETE FROM app_meta;`);
  },

  getDefaults() {
    return {
      defaultCadenceDays: this.getDefaultCadence(),
      notificationsEnabled: this.getNotificationsEnabled(),
    };
  },
};
