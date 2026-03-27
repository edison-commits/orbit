import { z } from 'zod';
import { DEFAULT_CADENCE_DAYS, DEFAULT_RELATIONSHIP_TYPE, DUE_STATES, INTERACTION_TYPES } from '@/lib/constants';

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  nickname: z.string().trim().optional().nullable(),
  relationshipType: z.string().default(DEFAULT_RELATIONSHIP_TYPE),
  cadence: z.number().int().positive().default(DEFAULT_CADENCE_DAYS),
  notes: z.string().optional().nullable(),
  isPaused: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  dueState: z.enum(DUE_STATES).default('upcoming'),
});

export const interactionSchema = z.object({
  occurredAt: z.string(),
  type: z.enum(INTERACTION_TYPES).optional().nullable(),
  note: z.string().optional().nullable(),
  contactIds: z.array(z.string()).min(1, 'Select at least one person'),
});
