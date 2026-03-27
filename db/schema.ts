export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    photo_uri TEXT,
    relationship_type TEXT NOT NULL,
    how_we_met TEXT,
    birthday TEXT,
    location TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    tags_json TEXT,
    cadence INTEGER NOT NULL DEFAULT 30,
    cadence_snoozed_until TEXT,
    is_paused INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TEXT,
    next_due_at TEXT,
    due_state TEXT NOT NULL DEFAULT 'upcoming',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_due ON contacts(due_state, next_due_at);`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_archived, is_paused);`,
  `CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY NOT NULL,
    occurred_at TEXT NOT NULL,
    type TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS interaction_contacts (
    interaction_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    PRIMARY KEY (interaction_id, contact_id),
    FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );`,
];
