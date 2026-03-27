import * as SQLite from 'expo-sqlite';
import { initialMigration } from '@/db/migrations/001_initial';

const DB_NAME = 'orbit.db';
const db = SQLite.openDatabaseSync(DB_NAME);

export function getDb() {
  return db;
}

export async function runMigrations() {
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);');

  const result = db.getFirstSync<{ version: number }>('SELECT version FROM schema_migrations WHERE version = ?;', [initialMigration.version]);
  if (result) return;

  db.withTransactionSync(() => {
    for (const statement of initialMigration.statements) {
      db.execSync(statement);
    }
    db.runSync(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime(\'now\'));',
      [initialMigration.version, initialMigration.name],
    );
  });
}
