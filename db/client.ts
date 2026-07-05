import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { initialMigration } from '@/db/migrations/001_initial';
import { migration003 } from '@/db/migrations/003_feedback';
import { migration004 } from '@/db/migrations/004_imported_contact_sources';

const DB_NAME = 'orbit.db';
let db: SQLite.SQLiteDatabase | null = null;

export const MIGRATIONS = [initialMigration, migration003, migration004];

function assertNativeDatabaseSupport() {
  if (Platform.OS === 'web') {
    throw new Error('Orbit SQLite storage is not available in web preview. Test on iOS/Android for the full local-first database experience.');
  }
}

export function getDb() {
  assertNativeDatabaseSupport();
  db ??= SQLite.openDatabaseSync(DB_NAME);
  return db;
}

export async function runMigrations() {
  const db = getDb();
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

  const m5Existing = db.getFirstSync<{ version: number }>(
    'SELECT version FROM schema_migrations WHERE version = 5;',
  );
  if (!m5Existing) {
    const tagsColumn = db.getFirstSync<{ name: string }>(
      "SELECT name FROM pragma_table_info('contacts') WHERE name = 'tags_json' LIMIT 1;",
    );
    db.withTransactionSync(() => {
      if (!tagsColumn) {
        db.execSync('ALTER TABLE contacts ADD COLUMN tags_json TEXT;');
      }
      db.runSync(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (5, '005_contact_tags', datetime('now'));",
      );
    });
  }
}
