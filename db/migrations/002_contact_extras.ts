export const MIGRATION_002_SQL = `
ALTER TABLE contacts ADD COLUMN social_json TEXT;
`;
