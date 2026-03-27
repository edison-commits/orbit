import { addDays, addMinutes, isAfter, set } from 'date-fns';

export const SNOOZE_OPTIONS = [
  { key: '3d', label: '3 days', days: 3 },
  { key: '1w', label: '1 week', days: 7 },
  { key: '2w', label: '2 weeks', days: 14 },
] as const;

export function getEffectiveDueAt(nextDueAt: string | null | undefined, cadenceSnoozedUntil: string | null | undefined) {
  if (!nextDueAt && !cadenceSnoozedUntil) return null;
  if (!nextDueAt) return cadenceSnoozedUntil ?? null;
  if (!cadenceSnoozedUntil) return nextDueAt;
  return new Date(cadenceSnoozedUntil) > new Date(nextDueAt) ? cadenceSnoozedUntil : nextDueAt;
}

export function createSnoozedUntil(days: number, now = new Date()) {
  return addDays(now, days).toISOString();
}

export function getReminderTriggerAt(nextDueAt: string | null | undefined, now = new Date()) {
  if (!nextDueAt) return null;

  const dueDate = new Date(nextDueAt);
  const dueMorning = set(dueDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });

  if (isAfter(dueMorning, now)) {
    return dueMorning;
  }

  return addMinutes(now, 1);
}
