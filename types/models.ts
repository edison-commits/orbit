import type { DUE_STATES, INTERACTION_TYPES } from '@/lib/constants';

export type DueState = (typeof DUE_STATES)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export interface Contact {
  id: string;
  name: string;
  nickname?: string | null;
  photoUri?: string | null;
  relationshipType: string;
  howWeMet?: string | null;
  birthday?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tagsJson?: string | null;
  cadence: number;
  cadenceSnoozedUntil?: string | null;
  isPaused: boolean;
  isArchived: boolean;
  lastInteractionAt?: string | null;
  nextDueAt?: string | null;
  dueState: DueState;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  occurredAt: string;
  type?: InteractionType | null;
  note?: string | null;
  createdAt: string;
}

export interface InteractionContact {
  interactionId: string;
  contactId: string;
}

export interface InteractionParticipant {
  id: string;
  name: string;
}

export interface InteractionTimelineItem extends Interaction {
  contacts: InteractionParticipant[];
  otherContacts: InteractionParticipant[];
}
