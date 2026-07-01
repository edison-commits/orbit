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
  photoUri?: string | null;
  relationshipType: string;
  notes?: string | null;
  birthday?: string | null;
  phone?: string | null;
  email?: string | null;
  socialJson?: string | null;
  tagsJson?: string | null;
  cadence: number;
  lastInteractionAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateContactRecord {
  id: string;
  name: string;
  nickname?: string | null;
  photoUri?: string | null;
  relationshipType: string;
  notes?: string | null;
  birthday?: string | null;
  phone?: string | null;
  email?: string | null;
  socialJson?: string | null;
  tagsJson?: string | null;
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

function withDerivedDueState<T extends Contact>(contact: T): T {
  return {
    ...contact,
    dueState: deriveContactDueState(
      contact.nextDueAt,
      contact.cadenceSnoozedUntil,
      Boolean(contact.isPaused),
      Boolean(contact.isArchived),
    ),
  };
}

export const contactsRepository = {
  listByUrgency(): ContactsListItem[] {
    const db = getDb();
    const rows = db.getAllSync<ContactsListItem>(
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
        social_json as socialJson,
        notes,
        tags_json as tagsJson,
        cadence,
        cadence_snoozed_until as cadenceSnoozedUntil,
        is_paused as isPaused,
        is_archived as isArchived,
        last_interaction_at as lastInteractionAt,
        next_due_at as nextDueAt,
        due_state as dueState,
        created_at as createdAt,
        updated_at as updatedAt
      FROM contacts
      WHERE is_archived = 0
      ORDER BY is_paused ASC, CASE due_state WHEN 'overdue' THEN 0 WHEN 'due' THEN 1 ELSE 2 END, ${effectiveDueSql()} ASC, name COLLATE NOCASE ASC;`,
    );

    const rank = { overdue: 0, due: 1, upcoming: 2, birthday: 3 } as const;
    return rows
      .map(withDerivedDueState)
      .sort((a, b) => {
        const aEffectiveDueAt = getEffectiveDueAt(a.nextDueAt, a.cadenceSnoozedUntil);
        const bEffectiveDueAt = getEffectiveDueAt(b.nextDueAt, b.cadenceSnoozedUntil);
        const aDueAt = a.isPaused || !aEffectiveDueAt ? Number.POSITIVE_INFINITY : new Date(aEffectiveDueAt).getTime();
        const bDueAt = b.isPaused || !bEffectiveDueAt ? Number.POSITIVE_INFINITY : new Date(bEffectiveDueAt).getTime();
        return rank[a.dueState] - rank[b.dueState] || aDueAt - bDueAt || a.name.localeCompare(b.name);
      });
  },
  listAll(): Contact[] {
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
        social_json as socialJson,
        notes,
        tags_json as tagsJson,
        cadence,
        cadence_snoozed_until as cadenceSnoozedUntil,
        is_paused as isPaused,
        is_archived as isArchived,
        last_interaction_at as lastInteractionAt,
        next_due_at as nextDueAt,
        due_state as dueState,
        created_at as createdAt,
        updated_at as updatedAt
      FROM contacts
      ORDER BY created_at ASC, name COLLATE NOCASE ASC;`,
    ).map(withDerivedDueState);
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
        social_json as socialJson,
        notes,
        tags_json as tagsJson,
        cadence,
        cadence_snoozed_until as cadenceSnoozedUntil,
        is_paused as isPaused,
        is_archived as isArchived,
        last_interaction_at as lastInteractionAt,
        next_due_at as nextDueAt,
        due_state as dueState,
        created_at as createdAt,
        updated_at as updatedAt
      FROM contacts
      WHERE is_archived = 0 AND is_paused = 0 AND ${effectiveDueSql()} IS NOT NULL;`,
    ).map(withDerivedDueState);
  },
  getById(id: string): Contact | null {
    const db = getDb();
    const contact =
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
          social_json as socialJson,
          notes,
          tags_json as tagsJson,
          cadence,
          cadence_snoozed_until as cadenceSnoozedUntil,
          is_paused as isPaused,
          is_archived as isArchived,
          last_interaction_at as lastInteractionAt,
          next_due_at as nextDueAt,
          due_state as dueState,
          created_at as createdAt,
          updated_at as updatedAt
        FROM contacts WHERE id = ? LIMIT 1;`,
        [id],
      ) ?? null;

    if (!contact) return null;
    return withDerivedDueState(contact);
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
        photo_uri,
        relationship_type,
        notes,
        birthday,
        phone,
        email,
        social_json,
        tags_json,
        cadence,
        last_interaction_at,
        next_due_at,
        due_state,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.id,
        input.name,
        input.nickname ?? null,
        input.photoUri ?? null,
        input.relationshipType,
        input.notes ?? null,
        input.birthday ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.socialJson ?? null,
        input.tagsJson ?? null,
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
           photo_uri = ?,
           relationship_type = ?,
           notes = ?,
           birthday = ?,
           phone = ?,
           email = ?,
           social_json = ?,
           tags_json = ?,
           cadence = ?,
           next_due_at = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [
        input.name,
        input.nickname ?? null,
        input.photoUri ?? null,
        input.relationshipType,
        input.notes ?? null,
        input.birthday ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.socialJson ?? null,
        input.tagsJson ?? null,
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
    const counts = { overdue: 0, due: 0, upcoming: 0 };
    for (const contact of this.listByUrgency()) {
      if (contact.isPaused) continue;
      if (contact.dueState === 'overdue') counts.overdue += 1;
      else if (contact.dueState === 'due') counts.due += 1;
      else counts.upcoming += 1;
    }
    return counts;
  },
  refreshAfterInteraction(contactId: string, occurredAt: string) {
    const db = getDb();
    const contact = db.getFirstSync<{
      cadence: number;
      isPaused: number;
      isArchived: number;
      lastInteractionAt: string | null;
      cadenceSnoozedUntil: string | null;
    }>(
      `SELECT
         cadence,
         is_paused as isPaused,
         is_archived as isArchived,
         last_interaction_at as lastInteractionAt,
         cadence_snoozed_until as cadenceSnoozedUntil
       FROM contacts
       WHERE id = ?
       LIMIT 1;`,
      [contactId],
    );

    if (!contact) throw new Error('Contact not found');

    const existingInteractionDate = contact.lastInteractionAt ? new Date(contact.lastInteractionAt) : null;
    const occurredDate = new Date(occurredAt);
    const isNewLatestInteraction = !existingInteractionDate || occurredDate >= existingInteractionDate;
    const latestInteractionAt = isNewLatestInteraction ? occurredAt : contact.lastInteractionAt!;
    const cadenceSnoozedUntil = isNewLatestInteraction ? null : contact.cadenceSnoozedUntil;
    const nextDueAt = calculateNextDueAt(latestInteractionAt, contact.cadence);
    const dueState = deriveContactDueState(nextDueAt, cadenceSnoozedUntil, Boolean(contact.isPaused), Boolean(contact.isArchived));

    db.runSync(
      `UPDATE contacts
       SET last_interaction_at = ?,
           next_due_at = ?,
           cadence_snoozed_until = ?,
           due_state = ?,
           updated_at = ?
       WHERE id = ?;`,
      [latestInteractionAt, nextDueAt, cadenceSnoozedUntil, dueState, toIsoNow(), contactId],
    );
  },
  getEffectiveDueAt(contact: Pick<Contact, 'nextDueAt' | 'cadenceSnoozedUntil'>) {
    return getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil);
  },
};
