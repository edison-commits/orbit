export const migration004 = {
  version: 4,
  name: '004_imported_contact_sources',
  statements: [
    `CREATE TABLE IF NOT EXISTS imported_contact_sources (
      source_id TEXT PRIMARY KEY NOT NULL,
      contact_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );`,
  ],
};
