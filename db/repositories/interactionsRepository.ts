import { getDb } from '@/db/client';
import type { Interaction, InteractionParticipant, InteractionTimelineItem } from '@/types/models';

export interface CreateInteractionRecord {
  id: string;
  occurredAt: string;
  type?: string | null;
  note?: string | null;
  createdAt: string;
  contactIds: string[];
}

export const interactionsRepository = {
  listRecent(limit = 10): Interaction[] {
    const db = getDb();
    return db.getAllSync<Interaction>(
      `SELECT id, occurred_at as occurredAt, type, note, created_at as createdAt
       FROM interactions
       ORDER BY occurred_at DESC
      LIMIT ?;`,
      [limit],
    );
  },
  listForContact(contactId: string, limit = 12): InteractionTimelineItem[] {
    const db = getDb();
    const rows = db.getAllSync<
      Interaction & {
        contactsRaw: string | null;
      }
    >(
      `SELECT
        i.id,
        i.occurred_at as occurredAt,
        i.type,
        i.note,
        i.created_at as createdAt,
        GROUP_CONCAT(c.id || CHAR(31) || c.name, CHAR(30)) as contactsRaw
       FROM interactions i
       JOIN interaction_contacts ic_target ON ic_target.interaction_id = i.id
       JOIN interaction_contacts ic_all ON ic_all.interaction_id = i.id
       JOIN contacts c ON c.id = ic_all.contact_id
       WHERE ic_target.contact_id = ?
       GROUP BY i.id, i.occurred_at, i.type, i.note, i.created_at
       ORDER BY i.occurred_at DESC
       LIMIT ?;`,
      [contactId, limit],
    );

    return rows.map((row) => {
      const contacts = parseParticipants(row.contactsRaw);

      return {
        id: row.id,
        occurredAt: row.occurredAt,
        type: row.type,
        note: row.note,
        createdAt: row.createdAt,
        contacts,
        otherContacts: contacts.filter((contact) => contact.id !== contactId),
      };
    });
  },
  createWithContacts(input: CreateInteractionRecord): Interaction {
    const db = getDb();

    db.runSync(
      `INSERT INTO interactions (id, occurred_at, type, note, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [input.id, input.occurredAt, input.type ?? null, input.note ?? null, input.createdAt],
    );

    for (const contactId of input.contactIds) {
      db.runSync(
        `INSERT INTO interaction_contacts (interaction_id, contact_id)
         VALUES (?, ?);`,
        [input.id, contactId],
      );
    }

    const created = db.getFirstSync<Interaction>(
      `SELECT id, occurred_at as occurredAt, type, note, created_at as createdAt
       FROM interactions
       WHERE id = ?
       LIMIT 1;`,
      [input.id],
    );

    if (!created) {
      throw new Error('Failed to load created interaction');
    }

    return created;
  },
};

function parseParticipants(value: string | null): InteractionParticipant[] {
  if (!value) return [];

  return value
    .split('\u001E')
    .map((entry) => entry.split('\u001F'))
    .filter((entry): entry is [string, string] => entry.length === 2 && Boolean(entry[0]) && Boolean(entry[1]))
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
