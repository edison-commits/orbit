import type { getDb } from '@/db/client';
import type { OrbitBackup } from '@/features/backup/backupEnvelope';

type OrbitDatabase = ReturnType<typeof getDb>;
export type BackupRestoreDatabase = Pick<
  OrbitDatabase,
  'withTransactionSync' | 'execSync' | 'runSync'
>;

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

export function restoreBackupSnapshot(
  backup: OrbitBackup,
  db: BackupRestoreDatabase,
  currentNotificationsEnabled: boolean | null,
): void {
  db.withTransactionSync(() => {
    db.execSync('DELETE FROM interaction_contacts;');
    db.execSync('DELETE FROM interactions;');
    db.execSync('DELETE FROM imported_contact_sources;');
    db.execSync('DELETE FROM feedback;');
    db.execSync('DELETE FROM contacts;');
    db.execSync('DELETE FROM app_meta;');

    for (const contact of backup.contacts) {
      const record = asRecord(contact);
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

    for (const interaction of backup.interactions) {
      const record = asRecord(interaction);
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
        [
          readRequiredString(record, 'interactionId', 'interaction_id'),
          readRequiredString(record, 'contactId', 'contact_id'),
        ],
      );
    }

    for (const source of backup.importedContactSources ?? []) {
      const record = asRecord(source);
      db.runSync(
        `INSERT OR IGNORE INTO imported_contact_sources (source_id, contact_id, created_at) VALUES (?, ?, ?);`,
        [
          readRequiredString(record, 'sourceId', 'source_id'),
          readRequiredString(record, 'contactId', 'contact_id'),
          readRequiredString(record, 'createdAt', 'created_at'),
        ],
      );
    }

    for (const feedback of backup.feedback ?? []) {
      db.runSync(
        `INSERT INTO feedback (id,type,message,created_at) VALUES (?,?,?,?);`,
        [feedback.id, feedback.type, feedback.message, feedback.created_at],
      );
    }

    db.runSync(`INSERT INTO app_meta (key,value) VALUES ('default_cadence_days',?);`, [
      String(backup.meta?.[0]?.defaultCadence ?? 30),
    ]);

    if (currentNotificationsEnabled !== null) {
      db.runSync(`INSERT INTO app_meta (key,value) VALUES ('notifications_enabled',?);`, [
        currentNotificationsEnabled ? 'true' : 'false',
      ]);
    }
  });
}
