import { schemaStatements } from '@/db/schema';

export const initialMigration = {
  version: 1,
  name: '001_initial',
  statements: schemaStatements,
};
