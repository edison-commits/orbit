import { getDb } from '@/db/client';
import { calculateNextDueAt, deriveContactDueState, toIsoNow } from '@/lib/dates';
import { getEffectiveDueAt } from '@/lib/reminders';
import type { Contact } from '@/types/models';

export interface ContactsListItem extends Contact {}

export interface ContactsSummaryCounts {
  overdue: number;
  due: number;
  upcoming: number;
}

export interface CreateContactRecord {
  id: string;
  name: string;
  nickname?: string | null;
  relationshipType: string;
  notes?: string | null;
  cadence: number;
  lastInteractionAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateContactRecord {
  id: string;
  name: string;
  nickname?: string | null;
  relationshipType: string;
  notes?: string | null;
  cadence: number;
  updatedAt: string;
}

function effectiveDueSql() {
  return `CASE
    WHEN cadence_snoozed_until IS NOT NULL AND (next_due_at IS NULL OR cadence_snoozed_until > next_due_at)
      THEN cadence_snoozed_until
    ELSE next_due_at
  END`;
}

export const contactsRepository = {
  listByUrgency(): ContactsListItem[] {
    const db = getDb();
    return db.getAllSync<ContactsListItem>(
      `SELECT
        id,
        name,
        nickname,
        photo_uri as photoUri,
        relationship_type as relationshipType,
        how_we_met as howWeMet,
        birthday,
        location,
        phone,
        email,
        notes,
        tags_json as tagsJson,
        cadence,
        cadence_snoozed_until as cadenceSnoozedUntil,
        is_paused as isPaused,
        is_archived as isArchived,
        last_interaction_at as lastInteractionAt,
        ${effectiveDueSql()} as nextDueAt,
        due_state as dueState,
        created_at as createdAt,
        updated_at as updatedAt
      FROM contacts
      WHERE is_archived = 0
      ORDER BY is_paused ASC, CASE due_state WHEN 'overdue' THEN 0 WHEN 'due' THEN 1 ELSE 2 END, ${effectiveDueSql()} ASC, name COLLATE NOCASE ASC;`,
    );
  },
  listRemindable(): Contact[] {
    const db = getDb();
    return db.getAllSync<Contact>(
      `SELECT
        id,
        name,
        nickname,
        photo_uri as photoUri,
        relationship_type as relationshipType,
        how_we_met as howWeMet,
        birthday,
        location,
        phone,
        email,
        notes,
        tags_json as tagsJson,
        cadence,
        cadence_snoozed_until as cadenceSnoozedUntil,
        is_paused as isPaused,
        is_archived as isArchived,
        last_interaction_at as lastInteractionAt,
        ${effectiveDueSql()} as nextDueAt,
        due_state as dueState,
        created_at as createdAt,
        updated_at as updatedAt
      FROM contacts
      WHERE is_archived = 0 AND is_paused = 0 AND ${effectiveDueSql()} IS NOT NULL;`,
    );
  },
  getById(id: string): Contact | null {
    const db = getDb();
    return (
      db.getFirstSync<Contact>(
        `SELECT
          id,
          name,
          nickname,
          photo_uri as photoUri,
          relationship_type as relationshipType,
          how_we_met as howWeMet,
          birthday,
          location,
          phone,
          email,
          notes,
          tags_json as tagsJson,
          cadence,
          cadence_snoozed_until as cadenceSnoozedUntil,
          is_paused as isPaused,
          is_archived as isArchived,
          last_interaction_at as lastInteractionAt,
          ${effectiveDueSql()} as nextDueAt,
          due_state as dueState,
          created_at as createdAt,
          updated_at as updatedAt
        FROM contacts WHERE id = ? LIMIT 1;`,
        [id],
      ) ?? null
    );
  },
  create(input: CreateContactRecord): Contact {
    const db = getDb();
    const nextDueAt = calculateNextDueAt(input.lastInteractionAt ?? null, input.cadence);
    const dueState = deriveContactDueState(nextDueAt, null, false, false);

    db.runSync(
      `INSERT INTO contacts (
        id,
        name,
        nickname,
        relationship_type,
        notes,
        cadence,
        last_interaction_at,
        next_due_at,
        due_state,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.id,
        input.name,
        input.nickname ?? null,
        input.relationshipType,
        input.notes ?? null,
        input.cadence,
        input.lastInteractionAt ?? null,
        nextDueAt,
        dueState,
        input.createdAt,
        input.updatedAt,
      ],
    );

    const created = this.getById(input.id);
    if (!created) throw new Error('Failed to load created contact');
    return created;
  },
  update(input: UpdateContactRecord): Contact {
    const db = getDb();
    const status = db.getFirstSync<{
      lastInteractionAt: string | null;
      isPaused: number;
      isArchived: number;
      cadenceSnoozedUntil: string | null;
    }>(
      `SELECT
        last_interaction_at as lastInteractionAt,
        is_paused as isPaused,
        is_archived as isArchived,
        cadence_snoozed_until as cadenceSnoozedUntil
       FROM contacts
       WHERE id = ?
       LIMIT 1;`,
      [input.id],
    );

    if (!status) throw new Error('Contact not found');

    const nextDueAt = calculateNextDueAt(status.lastInteractionAt, input.cadence);
    const dueState = deriveContactDueState(
      nextDueAt,
      status.cadenceSnoozedUntil,
      Boolean(status.isPaused),
      Boolean(status.isArchived),
    );

    db.runSync(
      `UPDATE contacts
       SET name = ?,
           nickname = ?,
           relationship_type = ?,
           notes = ?,
           cadence = ?,
           next_due_at = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [
        input.name,
        input.nickname ?? null,
        input.relationshipType,
        input.notes ?? null,
        input.cadence,
        nextDueAt,
        dueState,
        input.updatedAt,
        input.id,
      ],
    );

    const updated = this.getById(input.id);
    if (!updated) throw new Error('Failed to load updated contact');
    return updated;
  },
  setPaused(contactId: string, isPaused: boolean): Contact {
    const db = getDb();
    const contact = db.getFirstSync<{ nextDueAt: string | null; isArchived: number; cadenceSnoozedUntil: string | null }>(
      `SELECT
        next_due_at as nextDueAt,
        is_archived as isArchived,
        cadence_snoozed_until as cadenceSnoozedUntil
       FROM contacts
       WHERE id = ?
       LIMIT 1;`,
      [contactId],
    );

    if (!contact) throw new Error('Contact not found');

    const dueState = deriveContactDueState(
      contact.nextDueAt,
      contact.cadenceSnoozedUntil,
      isPaused,
      Boolean(contact.isArchived),
    );

    db.runSync(
      `UPDATE contacts
       SET is_paused = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [isPaused ? 1 : 0, dueState, toIsoNow(), contactId],
    );

    const updated = this.getById(contactId);
    if (!updated) throw new Error('Failed to load updated contact');
    return updated;
  },
  setArchived(contactId: string, isArchived: boolean): Contact {
    const db = getDb();
    const contact = db.getFirstSync<{ nextDueAt: string | null; isPaused: number; cadenceSnoozedUntil: string | null }>(
      `SELECT
        next_due_at as nextDueAt,
        is_paused as isPaused,
        cadence_snoozed_until as cadenceSnoozedUntil
       FROM contacts
       WHERE id = ?
       LIMIT 1;`,
      [contactId],
    );

    if (!contact) throw new Error('Contact not found');

    const dueState = deriveContactDueState(
      contact.nextDueAt,
      contact.cadenceSnoozedUntil,
      Boolean(contact.isPaused),
      isArchived,
    );

    db.runSync(
      `UPDATE contacts
       SET is_archived = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [isArchived ? 1 : 0, dueState, toIsoNow(), contactId],
    );

    const updated = this.getById(contactId);
    if (!updated) throw new Error('Failed to load updated contact');
    return updated;
  },
  setSnoozedUntil(contactId: string, cadenceSnoozedUntil: string | null): Contact {
    const db = getDb();
    const contact = db.getFirstSync<{ nextDueAt: string | null; isPaused: number; isArchived: number }>(
      `SELECT next_due_at as nextDueAt, is_paused as isPaused, is_archived as isArchived
       FROM contacts
       WHERE id = ?
       LIMIT 1;`,
      [contactId],
    );

    if (!contact) throw new Error('Contact not found');

    const dueState = deriveContactDueState(
      contact.nextDueAt,
      cadenceSnoozedUntil,
      Boolean(contact.isPaused),
      Boolean(contact.isArchived),
    );

    db.runSync(
      `UPDATE contacts
       SET cadence_snoozed_until = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [cadenceSnoozedUntil, dueState, toIsoNow(), contactId],
    );

    const updated = this.getById(contactId);
    if (!updated) throw new Error('Failed to load updated contact');
    return updated;
  },
  clearExpiredSnoozes(now = new Date()) {
    const db = getDb();
    const rows = db.getAllSync<{ id: string; nextDueAt: string | null; isPaused: number; isArchived: number }>(
      `SELECT id, next_due_at as nextDueAt, is_paused as isPaused, is_archived as isArchived
       FROM contacts
       WHERE cadence_snoozed_until IS NOT NULL AND cadence_snoozed_until <= ?;`,
      [now.toISOString()],
    );

    for (const row of rows) {
      const dueState = deriveContactDueState(row.nextDueAt, null, Boolean(row.isPaused), Boolean(row.isArchived), now);
      db.runSync(
        `UPDATE contacts
         SET cadence_snoozed_until = NULL,
             due_state = ?,
             updated_at = ?
         WHERE id = ?;`,
        [dueState, now.toISOString(), row.id],
      );
    }

    return rows.length;
  },
  getSummaryCounts(): ContactsSummaryCounts {
    const db = getDb();
    const row = db.getFirstSync<ContactsSummaryCounts>(
      `SELECT
        SUM(CASE WHEN due_state = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN due_state = 'due' THEN 1 ELSE 0 END) as due,
        SUM(CASE WHEN due_state = 'upcoming' THEN 1 ELSE 0 END) as upcoming
       FROM contacts
       WHERE is_archived = 0 AND is_paused = 0;`,
    );

    return {
      overdue: row?.overdue ?? 0,
      due: row?.due ?? 0,
      upcoming: row?.upcoming ?? 0,
    };
  },
  refreshAfterInteraction(contactId: string, occurredAt: string) {
    const db = getDb();
    const contact = db.getFirstSync<{ cadence: number; isPaused: number; isArchived: number }>(
      `SELECT cadence, is_paused as isPaused, is_archived as isArchived FROM contacts WHERE id = ? LIMIT 1;`,
      [contactId],
    );

    if (!contact) throw new Error('Contact not found');

    const nextDueAt = calculateNextDueAt(occurredAt, contact.cadence);
    const dueState = deriveContactDueState(nextDueAt, null, Boolean(contact.isPaused), Boolean(contact.isArchived));

    db.runSync(
      `UPDATE contacts
       SET last_interaction_at = ?,
           next_due_at = ?,
           cadence_snoozed_until = NULL,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [occurredAt, nextDueAt, dueState, toIsoNow(), contactId],
    );
  },
  getEffectiveDueAt(contact: Pick<Contact, 'nextDueAt' | 'cadenceSnoozedUntil'>) {
    return getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil);
  },
};
