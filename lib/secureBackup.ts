/**
 * Compatibility facade for existing backup callers.
 *
 * Backup responsibilities live under features/backup; keep this path stable while
 * callers migrate at their own pace.
 */
export {
  clearServiceKey,
  createBackup,
  getServiceKey,
  isConfigured,
  listBackups,
  restoreBackup,
  setServiceKey,
  testConnection,
} from '@/features/backup/backupService';
export type { OrbitBackup } from '@/features/backup/backupService';
