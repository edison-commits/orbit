import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDb } from '@/db/client';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { feedbackRepository } from '@/db/repositories/feedbackRepository';
import { interactionsRepository } from '@/db/repositories/interactionsRepository';
import {
  getStoredServiceKey,
  removeStoredServiceKey,
  storeServiceKey,
} from '@/features/backup/backupCredentials';
import {
  parseBackupEnvelope,
  serializeBackupEnvelope,
  type ImportedContactSource,
  type OrbitBackup,
} from '@/features/backup/backupEnvelope';
import { restoreBackupSnapshot } from '@/features/backup/restoreBackup';
import { settingsService } from '@/features/settings/settingsService';

export type { OrbitBackup } from '@/features/backup/backupEnvelope';

const SUPABASE_URL = 'https://jkdgdcfpgxjfdlccvqjf.supabase.co';
const BACKUP_BUCKET = 'orbit-backups';

let supabaseClient: SupabaseClient | null = null;

function getClient(serviceKey: string): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function listImportedContactSources(): ImportedContactSource[] {
  return getDb().getAllSync<ImportedContactSource>(
    `SELECT source_id AS sourceId, contact_id AS contactId, created_at AS createdAt
     FROM imported_contact_sources;`,
  );
}

function buildBackupSnapshot(): OrbitBackup {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    contacts: contactsRepository.listAll(),
    interactions: interactionsRepository.listAll(),
    interactionContacts: interactionsRepository.listContactLinks(),
    importedContactSources: listImportedContactSources(),
    feedback: feedbackRepository.getAll(),
    meta: [{ defaultCadence: settingsService.getDefaultCadence() }],
  };
}

export function getServiceKey(): Promise<string | null> {
  return getStoredServiceKey();
}

export async function setServiceKey(key: string): Promise<void> {
  await storeServiceKey(key);
  supabaseClient = null;
}

export async function clearServiceKey(): Promise<void> {
  await removeStoredServiceKey();
  supabaseClient = null;
}

export async function isConfigured(): Promise<boolean> {
  const key = await getServiceKey();
  return !!key;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  const key = await getServiceKey();
  if (!key) return { ok: false, error: 'No service key configured' };

  try {
    const { error } = await getClient(key).storage.from(BACKUP_BUCKET).list('', { limit: 1 });
    if (error) return { ok: false, error: `Cannot access orbit-backups: ${error.message}` };
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createBackup(): Promise<string> {
  const key = await getServiceKey();
  if (!key) throw new Error('Service key not configured. Please add it in Settings → Cloud Backup.');

  const backup = buildBackupSnapshot();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `orbit_backup_${date}_${Date.now()}.json`;
  const blob = serializeBackupEnvelope(backup);
  const { error } = await getClient(key).storage
    .from(BACKUP_BUCKET)
    .upload(filename, blob, { contentType: 'application/json', upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return filename;
}

export async function listBackups(): Promise<{ name: string; created_at: string }[]> {
  const key = await getServiceKey();
  if (!key) return [];

  const { data, error } = await getClient(key).storage
    .from(BACKUP_BUCKET)
    .list('', { sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw new Error(`List failed: ${error.message}`);
  return (data ?? [])
    .filter((file) => file.name.startsWith('orbit_backup_') && file.name.endsWith('.json'))
    .map((file) => ({ name: file.name, created_at: file.created_at ?? '' }));
}

export async function restoreBackup(filename: string): Promise<void> {
  const key = await getServiceKey();
  if (!key) throw new Error('Service key not configured.');

  const { data, error } = await getClient(key).storage.from(BACKUP_BUCKET).download(filename);
  if (error || !data) throw new Error(`Download failed: ${error?.message}`);

  const backup = parseBackupEnvelope(await data.text());
  restoreBackupSnapshot(backup, getDb(), settingsService.getNotificationsPreference());
}
