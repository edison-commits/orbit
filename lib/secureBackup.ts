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
import { settingsService } from '@/features/settings/settingsService';
import type { Contact, Interaction, InteractionContact } from '@/types/models';

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
  _supabase = null;
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
  contacts: Contact[];
  interactions: Interaction[];
  interactionContacts?: InteractionContact[];
  feedback: ReturnType<typeof feedbackRepository.getAll>;
  meta: { defaultCadence: number }[];
}

type BackupRecord = Record<string, unknown>;

function asRecord(value: unknown): BackupRecord {
  return value && typeof value === 'object' ? (value as BackupRecord) : {};
}

function readValue(record: BackupRecord, camelKey: string, snakeKey?: string): unknown {
  return record[camelKey] ?? (snakeKey ? record[snakeKey] : undefined);
}

function readString(record: BackupRecord, camelKey: string, snakeKey?: string): string | null {
  const value = readValue(record, camelKey, snakeKey);
  if (value === undefined || value === null) return null;
  return String(value);
}

function readRequiredString(record: BackupRecord, camelKey: string, snakeKey?: string): string {
  const value = readString(record, camelKey, snakeKey);
  if (!value) throw new Error(`Invalid backup file: missing ${camelKey}`);
  return value;
}

function readNumber(record: BackupRecord, camelKey: string, snakeKey: string, fallback: number): number {
  const value = readValue(record, camelKey, snakeKey);
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFlag(record: BackupRecord, camelKey: string, snakeKey: string): number {
  const value = readValue(record, camelKey, snakeKey);
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

export async function createBackup(): Promise<string> {
  const key = await getServiceKey();
  if (!key) throw new Error('Service key not configured. Please add it in Settings → Cloud Backup.');

  const supabase = getClient(key);

  const backup: OrbitBackup = {
    version: 1,
    exported_at: new Date().toISOString(),
    contacts: contactsRepository.listAll(),
    interactions: interactionsRepository.listAll(),
    interactionContacts: interactionsRepository.listContactLinks(),
    feedback: feedbackRepository.getAll(),
    meta: [{ defaultCadence: settingsService.getDefaultCadence() }],
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
  const currentNotificationsEnabled = settingsService.getNotificationsPreference();

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
      const record = asRecord(c);
      db.runSync(
        `INSERT INTO contacts (id,name,nickname,photo_uri,relationship_type,how_we_met,birthday,location,phone,email,social_json,notes,tags_json,cadence,cadence_snoozed_until,is_paused,is_archived,last_interaction_at,next_due_at,due_state,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
        [
          readRequiredString(record, 'id'),
          readRequiredString(record, 'name'),
          readString(record, 'nickname'),
          readString(record, 'photoUri', 'photo_uri'),
          readRequiredString(record, 'relationshipType', 'relationship_type'),
          readString(record, 'howWeMet', 'how_we_met'),
          readString(record, 'birthday'),
          readString(record, 'location'),
          readString(record, 'phone'),
          readString(record, 'email'),
          readString(record, 'socialJson', 'social_json'),
          readString(record, 'notes'),
          readString(record, 'tagsJson', 'tags_json'),
          readNumber(record, 'cadence', 'cadence', 30),
          readString(record, 'cadenceSnoozedUntil', 'cadence_snoozed_until'),
          readFlag(record, 'isPaused', 'is_paused'),
          readFlag(record, 'isArchived', 'is_archived'),
          readString(record, 'lastInteractionAt', 'last_interaction_at'),
          readString(record, 'nextDueAt', 'next_due_at'),
          readRequiredString(record, 'dueState', 'due_state'),
          readRequiredString(record, 'createdAt', 'created_at'),
          readRequiredString(record, 'updatedAt', 'updated_at'),
        ],
      );
    }

    for (const i of backup.interactions) {
      const record = asRecord(i);
      db.runSync(
        `INSERT INTO interactions (id,occurred_at,type,note,created_at) VALUES (?,?,?,?,?);`,
        [
          readRequiredString(record, 'id'),
          readRequiredString(record, 'occurredAt', 'occurred_at'),
          readString(record, 'type'),
          readString(record, 'note'),
          readRequiredString(record, 'createdAt', 'created_at'),
        ],
      );
    }

    for (const link of backup.interactionContacts ?? []) {
      const record = asRecord(link);
      db.runSync(
        `INSERT INTO interaction_contacts (interaction_id, contact_id) VALUES (?, ?);`,
        [readRequiredString(record, 'interactionId', 'interaction_id'), readRequiredString(record, 'contactId', 'contact_id')],
      );
    }

    for (const f of backup.feedback) {
      db.runSync(
        `INSERT INTO feedback (id,type,message,created_at) VALUES (?,?,?,?);`,
        [f.id, f.type, f.message, f.created_at],
      );
    }

    db.runSync(`INSERT INTO app_meta (key,value) VALUES ('default_cadence_days',?);`, [
      String(backup.meta?.[0]?.defaultCadence ?? 30),
    ]);
    // Reminder opt-in is device-local consent. Preserve this device's explicit setting across restores.
    // If this device has no explicit local choice yet, keep the preference unset rather than manufacturing one.
    if (currentNotificationsEnabled !== null) {
      db.runSync(`INSERT INTO app_meta (key,value) VALUES ('notifications_enabled',?);`, [
        currentNotificationsEnabled ? 'true' : 'false',
      ]);
    }
  });
}
