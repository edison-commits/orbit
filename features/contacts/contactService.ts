import { contactsRepository } from '@/db/repositories/contactsRepository';
import { reminderService } from '@/features/reminders/reminderService';
import { DEFAULT_CADENCE_DAYS, DEFAULT_RELATIONSHIP_TYPE } from '@/lib/constants';
import { calculateNextDueAt, deriveDueState, toIsoNow } from '@/lib/dates';
import { createId } from '@/lib/id';
import { createSnoozedUntil } from '@/lib/reminders';
import { contactSchema } from '@/lib/validation';
import type { Contact } from '@/types/models';

export function buildContactDraft(input: Partial<Contact>) {
  const now = toIsoNow();
  const cadence = input.cadence ?? 30;
  const lastInteractionAt = input.lastInteractionAt ?? null;
  const nextDueAt = input.nextDueAt ?? calculateNextDueAt(lastInteractionAt, cadence);
  const dueState = input.dueState ?? deriveDueState(nextDueAt);

  return contactSchema.parse({
    name: input.name ?? '',
    nickname: input.nickname ?? null,
    relationshipType: input.relationshipType ?? 'friend',
    cadence,
    notes: input.notes ?? null,
    isPaused: input.isPaused ?? false,
    isArchived: input.isArchived ?? false,
    dueState,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  });
}

export async function createContact(input: Pick<Contact, 'name' | 'nickname' | 'relationshipType' | 'cadence' | 'notes'>) {
  const draft = buildContactDraft({
    name: input.name,
    nickname: input.nickname,
    relationshipType: input.relationshipType || DEFAULT_RELATIONSHIP_TYPE,
    cadence: input.cadence || DEFAULT_CADENCE_DAYS,
    notes: input.notes,
  });
  const now = toIsoNow();

  const contact = contactsRepository.create({
    id: createId('contact'),
    name: draft.name,
    nickname: draft.nickname,
    relationshipType: draft.relationshipType,
    notes: draft.notes,
    cadence: draft.cadence,
    createdAt: now,
    updatedAt: now,
  });

  await reminderService.syncNotifications();
  return contact;
}

export async function updateContact(input: Pick<Contact, 'id' | 'name' | 'nickname' | 'relationshipType' | 'cadence' | 'notes'>) {
  const draft = buildContactDraft({
    id: input.id,
    name: input.name,
    nickname: input.nickname,
    relationshipType: input.relationshipType || DEFAULT_RELATIONSHIP_TYPE,
    cadence: input.cadence || DEFAULT_CADENCE_DAYS,
    notes: input.notes,
  });

  const contact = contactsRepository.update({
    id: input.id,
    name: draft.name,
    nickname: draft.nickname,
    relationshipType: draft.relationshipType,
    notes: draft.notes,
    cadence: draft.cadence,
    updatedAt: toIsoNow(),
  });

  await reminderService.syncNotifications();
  return contact;
}

export async function setContactPaused(contactId: string, isPaused: boolean) {
  const contact = contactsRepository.setPaused(contactId, isPaused);
  await reminderService.syncNotifications();
  return contact;
}

export async function setContactArchived(contactId: string, isArchived: boolean) {
  const contact = contactsRepository.setArchived(contactId, isArchived);
  await reminderService.syncNotifications();
  return contact;
}

export async function snoozeContact(contactId: string, days: number) {
  const contact = contactsRepository.setSnoozedUntil(contactId, createSnoozedUntil(days));
  await reminderService.syncNotifications();
  return contact;
}

export async function clearContactSnooze(contactId: string) {
  const contact = contactsRepository.setSnoozedUntil(contactId, null);
  await reminderService.syncNotifications();
  return contact;
}
