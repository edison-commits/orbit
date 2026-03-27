import * as SQLite from 'expo-sqlite';
import { initialMigration } from '@/db/migrations/001_initial';
import { migration003 } from '@/db/migrations/003_feedback';

const DB_NAME = 'orbit.db';
const db = SQLite.openDatabaseSync(DB_NAME);

export const MIGRATIONS = [initialMigration, migration003];

export function getDb() {
  return db;
}

export async function runMigrations() {
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);');

  for (const migration of MIGRATIONS) {
    const existing = db.getFirstSync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?;',
      [migration.version],
    );
    if (existing) continue;

    db.withTransactionSync(() => {
      for (const statement of migration.statements) {
        db.execSync(statement);
      }
      db.runSync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime(\'now\'));',
        [migration.version, migration.name],
      );
    });
  }

  // Run migration 002 inline — avoid circular require
  const m2Existing = db.getFirstSync<{ version: number }>(
    'SELECT version FROM schema_migrations WHERE version = 2;',
  );
  if (!m2Existing) {
    db.withTransactionSync(() => {
      db.execSync('ALTER TABLE contacts ADD COLUMN social_json TEXT;');
      db.runSync(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (2, '002_contact_extras', datetime('now'));",
      );
    });
  }
}
