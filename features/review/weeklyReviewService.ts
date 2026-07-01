import { contactsRepository, type ContactsListItem } from '@/db/repositories/contactsRepository';
import { getDaysSinceDate, getDaysUntilBirthday, getDaysUntilDate } from '@/lib/dates';
import { getEffectiveDueAt } from '@/lib/reminders';

export type ReviewPriority = 'high' | 'medium' | 'low';
export type ReviewRoute = '/people' | `/people?due=${'overdue' | 'due' | 'upcoming'}` | `/contact/${string}`;

export interface WeeklyReviewAction {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  priority: ReviewPriority;
  contactIds: string[];
  route?: ReviewRoute;
}

export interface WeeklyReviewSummary {
  activeCount: number;
  pausedCount: number;
  archivedCount: number;
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  contactedThisWeekCount: number;
  birthdaysNext14Days: ContactsListItem[];
  neglectedContacts: ContactsListItem[];
  actions: WeeklyReviewAction[];
}

function sortByEffectiveDueThenName(a: ContactsListItem, b: ContactsListItem) {
  const aDue = getEffectiveDueAt(a.nextDueAt, a.cadenceSnoozedUntil);
  const bDue = getEffectiveDueAt(b.nextDueAt, b.cadenceSnoozedUntil);
  const aTime = aDue ? new Date(aDue).getTime() : Number.POSITIVE_INFINITY;
  const bTime = bDue ? new Date(bDue).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime || a.name.localeCompare(b.name);
}

export function getWeeklyReviewSummary(now = new Date()): WeeklyReviewSummary {
  const contacts = contactsRepository.listByUrgency();
  const allContacts = contactsRepository.listAll();
  const active = contacts.filter((contact) => !contact.isArchived && !contact.isPaused);
  const paused = contacts.filter((contact) => !contact.isArchived && contact.isPaused);
  const archivedCount = allContacts.filter((contact) => contact.isArchived).length;
  const overdue = active.filter((contact) => contact.dueState === 'overdue').sort(sortByEffectiveDueThenName);
  const dueToday = active.filter((contact) => contact.dueState === 'due').sort(sortByEffectiveDueThenName);
  const dueNowIds = new Set([...overdue, ...dueToday].map((contact) => contact.id));
  const dueThisWeek = active.filter((contact) => {
    const days = getDaysUntilDate(getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil), now);
    return days !== null && days > 0 && days <= 7;
  }).sort(sortByEffectiveDueThenName);

  const contactedThisWeekIds = new Set<string>();
  active.forEach((contact) => {
    const days = getDaysSinceDate(contact.lastInteractionAt, now);
    if (days !== null && days >= 0 && days <= 7) {
      contactedThisWeekIds.add(contact.id);
    }
  });

  const birthdaysNext14Days = active
    .filter((contact) => {
      const days = getDaysUntilBirthday(contact.birthday, now);
      return days !== null && days >= 0 && days <= 14;
    })
    .sort((a, b) => (getDaysUntilBirthday(a.birthday, now) ?? 99) - (getDaysUntilBirthday(b.birthday, now) ?? 99));
  const birthdayIds = new Set(birthdaysNext14Days.map((contact) => contact.id));
  const birthdayActionContacts = birthdaysNext14Days.filter((contact) => !dueNowIds.has(contact.id));

  const neglectedContacts = active
    .filter((contact) => {
      if (contactedThisWeekIds.has(contact.id)) return false;
      if (dueNowIds.has(contact.id)) return false;
      if (contact.cadenceSnoozedUntil && new Date(contact.cadenceSnoozedUntil) > now) return false;
      const days = getDaysSinceDate(contact.lastInteractionAt ?? contact.createdAt, now);
      const quietThresholdDays = Math.max(60, contact.cadence * 2);
      return days !== null && days >= quietThresholdDays;
    })
    .sort((a, b) => (getDaysSinceDate(b.lastInteractionAt ?? b.createdAt, now) ?? 9999) - (getDaysSinceDate(a.lastInteractionAt ?? a.createdAt, now) ?? 9999));

  const actions: WeeklyReviewAction[] = [];
  const recommendedActionIds = new Set<string>();
  if (overdue.length > 0) {
    actions.push({
      key: 'overdue',
      title: overdue.length === 1 ? 'Rescue overdue relationship' : `Rescue ${overdue.length} overdue relationships`,
      subtitle: overdue.length === 1 ? `${overdue[0].name} is past cadence.` : `${overdue[0].name} +${overdue.length - 1} more are past cadence.`,
      icon: 'alert-circle',
      priority: 'high',
      contactIds: overdue.map((contact) => contact.id),
      route: overdue.length === 1 ? `/contact/${overdue[0].id}` : '/people?due=overdue',
    });
    overdue.forEach((contact) => recommendedActionIds.add(contact.id));
  }

  if (dueToday.length > 0) {
    actions.push({
      key: 'due-today',
      title: dueToday.length === 1 ? `Check in with ${dueToday[0].name}` : `Check in with ${dueToday.length} people`,
      subtitle: dueToday.length === 1 ? 'Due for a touchpoint today.' : `${dueToday[0].name} +${dueToday.length - 1} more are due today.`,
      icon: 'clock-outline',
      priority: 'high',
      contactIds: dueToday.map((contact) => contact.id),
      route: dueToday.length === 1 ? `/contact/${dueToday[0].id}` : '/people?due=due',
    });
    dueToday.forEach((contact) => recommendedActionIds.add(contact.id));
  }

  if (birthdayActionContacts.length > 0) {
    const first = birthdayActionContacts[0];
    actions.push({
      key: 'birthdays',
      title: `Prep ${first.name}'s birthday`,
      subtitle: 'Birthday is within 14 days.',
      icon: 'cake-variant',
      priority: 'medium',
      contactIds: [first.id],
      route: `/contact/${first.id}`,
    });
    recommendedActionIds.add(first.id);
  }

  const neglectedActionContacts = neglectedContacts.filter((contact) => !recommendedActionIds.has(contact.id));
  if (neglectedActionContacts.length > 0) {
    const first = neglectedActionContacts[0];
    actions.push({
      key: 'neglected',
      title: `Re-open ${first.name}`,
      subtitle: `No touchpoint in ${Math.max(60, first.cadence * 2)}+ days.`,
      icon: 'radar',
      priority: overdue.length > 0 ? 'medium' : 'high',
      contactIds: [first.id],
      route: `/contact/${first.id}`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      key: 'steady',
      title: 'Orbit is steady',
      subtitle: dueThisWeek[0] ? `${dueThisWeek[0].name} is coming up this week.` : 'No urgent relationship maintenance surfaced this week.',
      icon: 'check-circle-outline',
      priority: 'low',
      contactIds: dueThisWeek[0] ? [dueThisWeek[0].id] : [],
      route: dueThisWeek[0] ? `/contact/${dueThisWeek[0].id}` : undefined,
    });
  }

  return {
    activeCount: active.length,
    pausedCount: paused.length,
    archivedCount,
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    dueThisWeekCount: dueThisWeek.length,
    contactedThisWeekCount: contactedThisWeekIds.size,
    birthdaysNext14Days,
    neglectedContacts,
    actions: actions.slice(0, 5),
  };
}
