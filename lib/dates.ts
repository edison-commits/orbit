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

type ParsedBirthday = {
  date: Date;
  hasYear: boolean;
  monthIndex: number;
  day: number;
};

function isValidMonthDay(year: number, monthIndex: number, day: number) {
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

function parseBirthday(value: string | null | undefined, referenceDate = new Date()): ParsedBirthday | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const monthIndex = month - 1;
    if (!isValidMonthDay(year, monthIndex, day)) return null;
    return { date: new Date(year, monthIndex, day), hasYear: true, monthIndex, day };
  }

  if (/^\d{1,2}[-/]\d{1,2}$/.test(value)) {
    const [month, day] = value.split(/[-/]/).map(Number);
    const monthIndex = month - 1;
    if (!isValidMonthDay(2000, monthIndex, day)) return null;
    return { date: new Date(referenceDate.getFullYear(), monthIndex, day), hasYear: false, monthIndex, day };
  }

  const displayMatch = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (displayMatch) {
    const [, monthName, dayValue, yearValue] = displayMatch;
    const monthIndex = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ].findIndex((month) => month.startsWith(monthName.toLowerCase()));
    const day = Number(dayValue);
    const year = yearValue ? Number(yearValue) : 2000;
    if (monthIndex >= 0 && isValidMonthDay(year, monthIndex, day)) {
      return { date: new Date(yearValue ? year : referenceDate.getFullYear(), monthIndex, day), hasYear: Boolean(yearValue), monthIndex, day };
    }
  }

  return null;
}

/** Format birthday string (e.g. "March 26" or "March 26 · 32 years old") */
export function formatBirthday(value: string | null | undefined): string {
  if (!value) return '—';

  const parsed = parseBirthday(value);
  if (!parsed) return value;

  const monthDay = format(new Date(2000, parsed.monthIndex, parsed.day), 'MMMM d');
  if (parsed.hasYear) {
    const today = new Date();
    let age = today.getFullYear() - parsed.date.getFullYear();
    const monthDelta = today.getMonth() - parsed.date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.date.getDate())) age--;
    if (age > 0) return `${monthDay} · ${age} years old`;
  }

  return monthDay;
}

/** Returns days until the next occurrence of a birthday, or null if unparseable. */
export function getDaysUntilBirthday(value: string | null | undefined, now = new Date()): number | null {
  const today = now;
  const parsed = parseBirthday(value, today);
  if (!parsed) return null;

  const todayStart = startOfDay(today);
  const thisYear = new Date(today.getFullYear(), parsed.monthIndex, parsed.day);
  const nextOccurrence = startOfDay(thisYear) >= todayStart ? thisYear : new Date(today.getFullYear() + 1, parsed.monthIndex, parsed.day);
  return differenceInCalendarDays(startOfDay(nextOccurrence), todayStart);
}

/** Short relative label for how long since last contact, for card use */
export function formatDaysAgo(value: string | null | undefined): string {
  const days = getDaysSinceDate(value);
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
