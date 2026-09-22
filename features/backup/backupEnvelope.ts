import type { Feedback } from '@/db/repositories/feedbackRepository';
import type { Contact, Interaction, InteractionContact } from '@/types/models';

export interface ImportedContactSource {
  sourceId: string;
  contactId: string;
  createdAt: string;
}

export interface OrbitBackup {
  version: number;
  exported_at: string;
  contacts: Contact[];
  interactions: Interaction[];
  interactionContacts?: InteractionContact[];
  importedContactSources?: ImportedContactSource[];
  feedback: Feedback[];
  meta: { defaultCadence: number }[];
}

export function serializeBackupEnvelope(backup: OrbitBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackupEnvelope(text: string): OrbitBackup {
  const backup = JSON.parse(text) as OrbitBackup;
  if (!backup.version || !backup.contacts) throw new Error('Invalid backup file');
  return backup;
}
