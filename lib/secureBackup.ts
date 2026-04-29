/**
 * Secure backup service — Supabase service role key is stored in expo-secure-store
 * and never committed to source.
 *
 * Setup: user enters the Supabase service role JWT in Settings → Cloud Backup.
 * The key is stored securely on-device only.
 */

import * as SecureStore from 'expo-secure-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { interactionsRepository } from '@/db/repositories/interactionsRepository';
import { feedbackRepository } from '@/db/repositories/feedbackRepository';

const SUPABASE_URL = 'https://jkdgdcfpgxjfdlccvqjf.supabase.co';
const SERVICE_KEY_REF = 'orbit_supabase_service_key';

// Lazy client — built only when key is available
let _supabase: SupabaseClient | null = null;

function getClient(serviceKey: string): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabase;
}

export async function getServiceKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SERVICE_KEY_REF);
}

export async function setServiceKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SERVICE_KEY_REF, key);
}

export async function clearServiceKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SERVICE_KEY_REF);
  _supabase = null;
}

// ── Backup operations ────────────────────────────────────────────

export async function isConfigured(): Promise<boolean> {
  const key = await getServiceKey();
  return !!key;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  const key = await getServiceKey();
  if (!key) return { ok: false, error: 'No service key configured' };

  try {
    const supabase = getClient(key);
    const { error } = await supabase.storage.listBuckets();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export interface OrbitBackup {
  version: number;
  exported_at: string;
  contacts: ReturnType<typeof contactsRepository.listByUrgency>;
  interactions: ReturnType<typeof interactionsRepository.listRecent>;
  feedback: ReturnType<typeof feedbackRepository.getAll>;
  meta: { defaultCadence: number }[];
}

export async function createBackup(): Promise<string> {
  const key = await getServiceKey();
  if (!key) throw new Error('Service key not configured. Please add it in Settings → Cloud Backup.');

  const supabase = getClient(key);

  const { getDb } = require('@/db/client') as { getDb: () => { getFirstSync<T>(sql: string, params: unknown[]): T | null } };
  const defaultCadence =
    getDb().getFirstSync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?;', ['defaultCadence']) ??
    { value: '30' };

  const backup: OrbitBackup = {
    version: 1,
    exported_at: new Date().toISOString(),
    contacts: contactsRepository.listByUrgency(),
    interactions: interactionsRepository.listRecent(9999),
    feedback: feedbackRepository.getAll(),
    meta: [{ defaultCadence: parseInt(defaultCadence.value, 10) }],
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `orbit_backup_${date}_${Date.now()}.json`;
  const blob = JSON.stringify(backup, null, 2);

  const { error } = await supabase.storage
    .from('orbit-backups')
    .upload(filename, blob, { contentType: 'application/json', upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return filename;
}

export async function listBackups(): Promise<{ name: string; created_at: string }[]> {
  const key = await getServiceKey();
  if (!key) return [];

  const supabase = getClient(key);
  const { data, error } = await supabase.storage
    .from('orbit-backups')
    .list('orbit_backup_', { sortBy: { column: 'created_at', order: 'desc' } });

  if (error) throw new Error(`List failed: ${error.message}`);
  return (data ?? []).map((f) => ({ name: f.name, created_at: f.created_at ?? '' }));
}

export async function restoreBackup(filename: string): Promise<void> {
  const key = await getServiceKey();
  if (!key) throw new Error('Service key not configured.');

  const supabase = getClient(key);
  const { data, error } = await supabase.storage.from('orbit-backups').download(filename);

  if (error || !data) throw new Error(`Download failed: ${error?.message}`);

  const text = await data.text();
  const backup: OrbitBackup = JSON.parse(text);

  if (!backup.version || !backup.contacts) throw new Error('Invalid backup file');

  const { getDb } = require('@/db/client') as { getDb: () => {
    withTransactionSync(fn: () => void): void;
    execSync(sql: string): void;
    runSync(sql: string, params: unknown[]): void;
  } };
  const db = getDb();

  db.withTransactionSync(() => {
    db.execSync('DELETE FROM interaction_contacts;');
    db.execSync('DELETE FROM interactions;');
    db.execSync('DELETE FROM contacts;');
    db.execSync('DELETE FROM app_meta;');

    for (const c of backup.contacts) {
      db.runSync(
        `INSERT INTO contacts (id,name,nickname,photo_uri,relationship_type,how_we_met,birthday,location,phone,email,notes,tags_json,cadence,cadence_snoozed_until,is_paused,is_archived,last_interaction_at,next_due_at,due_state,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
        [c.id, c.name, c.nickname, c.photoUri, c.relationshipType, c.howWeMet, c.birthday, c.location, c.phone, c.email, c.notes, c.tagsJson, c.cadence, c.cadenceSnoozedUntil ?? null, c.isPaused ?? 0, c.isArchived ?? 0, c.lastInteractionAt ?? null, c.nextDueAt ?? null, c.dueState, c.createdAt, c.updatedAt],
      );
    }

    for (const i of backup.interactions) {
      db.runSync(
        `INSERT INTO interactions (id,occurred_at,type,note,created_at) VALUES (?,?,?,?,?);`,
        [i.id, i.occurredAt, i.type ?? null, i.note ?? null, i.createdAt],
      );
    }

    for (const f of backup.feedback) {
      db.runSync(
        `INSERT INTO feedback (id,type,message,created_at) VALUES (?,?,?,?);`,
        [f.id, f.type, f.message, f.created_at],
      );
    }

    if (backup.meta?.[0]) {
      db.runSync(`INSERT INTO app_meta (key,value) VALUES ('defaultCadence',?);`, [
        String(backup.meta[0].defaultCadence),
      ]);
    }
  });
}
