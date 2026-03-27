import { getDb } from '@/db/client';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { interactionsRepository } from '@/db/repositories/interactionsRepository';
import { reminderService } from '@/features/reminders/reminderService';
import { toIsoNow } from '@/lib/dates';
import { createId } from '@/lib/id';
import { interactionSchema } from '@/lib/validation';

function normalizeContactIds(contactIds: string[]) {
  return [...new Set(contactIds.filter(Boolean))];
}

export function buildInteractionDraft(input: {
  occurredAt: string;
  type?: string | null;
  note?: string | null;
  contactIds: string[];
}) {
  return interactionSchema.parse({
    ...input,
    contactIds: normalizeContactIds(input.contactIds),
  });
}

export async function saveInteraction(input: {
  occurredAt?: string;
  type?: string | null;
  note?: string | null;
  contactIds: string[];
}) {
  const draft = buildInteractionDraft({
    occurredAt: input.occurredAt ?? toIsoNow(),
    type: input.type,
    note: input.note,
    contactIds: input.contactIds,
  });
  const db = getDb();
  const createdAt = toIsoNow();
  let interactionId = '';

  db.withTransactionSync(() => {
    const interaction = interactionsRepository.createWithContacts({
      id: createId('interaction'),
      occurredAt: draft.occurredAt,
      type: draft.type,
      note: draft.note,
      createdAt,
      contactIds: draft.contactIds,
    });
    interactionId = interaction.id;

    for (const contactId of draft.contactIds) {
      contactsRepository.refreshAfterInteraction(contactId, draft.occurredAt);
    }
  });

  await reminderService.syncNotifications();
  return interactionId;
}
