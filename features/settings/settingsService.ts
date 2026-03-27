import { getDb } from '@/db/client';

const DEFAULT_CADENCE_KEY = 'default_cadence_days';
const DEFAULT_CADENCE_DEFAULT = 30;

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

  resetAllData(): void {
    const db = getDb();
    db.runSync(`DELETE FROM interaction_contacts;`);
    db.runSync(`DELETE FROM interactions;`);
    db.runSync(`DELETE FROM contacts;`);
    db.runSync(`DELETE FROM app_meta;`);
  },

  getDefaults() {
    return {
      defaultCadenceDays: this.getDefaultCadence(),
      notificationsEnabled: true,
    };
  },
};
