export const MIGRATION_003_SQL = `
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL DEFAULT 'feature',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const migration003 = {
  version: 3,
  name: '003_feedback',
  statements: [MIGRATION_003_SQL],
};
