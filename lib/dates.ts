import { addDays, differenceInCalendarDays, format, isBefore, startOfDay } from 'date-fns';
import { getEffectiveDueAt } from '@/lib/reminders';
import { DUE_COLORS } from '@/lib/theme';
import type { DueState } from '@/types/models';

export function getDueColor(dueState: DueState | string): string {
  return DUE_COLORS[dueState as keyof typeof DUE_COLORS] ?? DUE_COLORS.upcoming;
}

export function toIsoNow() {
  return new Date().toISOString();
}

export function calculateNextDueAt(lastInteractionAt: string | null, cadenceDays: number) {
  const anchor = lastInteractionAt ? new Date(lastInteractionAt) : new Date();
  return addDays(anchor, cadenceDays).toISOString();
}

export function deriveDueState(nextDueAt: string | null, now = new Date()): DueState {
  if (!nextDueAt) return 'upcoming';
  const dueDate = startOfDay(new Date(nextDueAt));
  const today = startOfDay(now);
  if (isBefore(dueDate, today)) return 'overdue';
  if (differenceInCalendarDays(dueDate, today) === 0) return 'due';
  return 'upcoming';
}

export function deriveContactDueState(
  nextDueAt: string | null | undefined,
  cadenceSnoozedUntil: string | null | undefined,
  isPaused: boolean,
  isArchived: boolean,
  now = new Date(),
): DueState {
  if (isPaused || isArchived) return 'upcoming';
  return deriveDueState(getEffectiveDueAt(nextDueAt, cadenceSnoozedUntil), now);
}

export function formatOrbitDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatOrbitDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export function getDaysSinceDate(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  return differenceInCalendarDays(startOfDay(now), startOfDay(new Date(value)));
}

export function getDaysUntilDate(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  return differenceInCalendarDays(startOfDay(new Date(value)), startOfDay(now));
}

export function formatDaysSinceContact(value: string | null | undefined, now = new Date()) {
  const daysSince = getDaysSinceDate(value, now);
  if (daysSince === null) return 'No interactions yet';
  if (daysSince === 0) return 'Contacted today';
  if (daysSince === 1) return 'Last contacted 1 day ago';
  return `Last contacted ${daysSince} days ago`;
}

export function formatDueLabel(nextDueAt: string | null | undefined, now = new Date()) {
  const daysUntil = getDaysUntilDate(nextDueAt, now);
  if (daysUntil === null) return 'No due date';
  if (daysUntil < 0) {
    const overdueDays = Math.abs(daysUntil);
    return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  }
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `Due in ${daysUntil} days`;
}
