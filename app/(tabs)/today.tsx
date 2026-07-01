import { useCallback, useMemo, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Icon, Text, useTheme } from 'react-native-paper';
import { contactsRepository, type ContactsListItem } from '@/db/repositories/contactsRepository';
import { formatDueLabel, getDaysUntilBirthday, getDaysUntilDate, getDueColor } from '@/lib/dates';
import { getEffectiveDueAt } from '@/lib/reminders';

type AgendaSection = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  contacts: ContactsListItem[];
  color: string;
};

function getBirthdayWindowLabel(contact: ContactsListItem) {
  const days = getDaysUntilBirthday(contact.birthday);
  if (days === null) return null;
  if (days > 30) return null;
  if (days === 0) return 'birthday today';
  if (days === 1) return 'birthday tomorrow';
  return `birthday in ${days} days`;
}

function buildAgendaSections(contacts: ContactsListItem[], colors: { tertiary: string }): AgendaSection[] {
  const active = contacts.filter((contact) => !contact.isPaused && !contact.isArchived);
  const birthdaySoon = active
    .filter((contact) => {
      if (contact.dueState === 'overdue' || contact.dueState === 'due') return false;
      const days = getDaysUntilBirthday(contact.birthday);
      return days !== null && days >= 0 && days <= 30;
    })
    .sort((a, b) => (getDaysUntilBirthday(a.birthday) ?? 99) - (getDaysUntilBirthday(b.birthday) ?? 99));
  const birthdayContactIds = new Set(birthdaySoon.map((contact) => contact.id));
  const standardContacts = active;
  const upcomingThisWeek = standardContacts
    .filter((contact) => {
      if (contact.dueState !== 'upcoming' || birthdayContactIds.has(contact.id)) return false;
      const days = getDaysUntilDate(getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil));
      return days !== null && days > 0 && days <= 7;
    });

  return [
    {
      key: 'overdue',
      title: 'Do first',
      subtitle: 'Overdue relationships that need a touchpoint.',
      icon: 'alert-circle',
      contacts: standardContacts.filter((contact) => contact.dueState === 'overdue'),
      color: getDueColor('overdue'),
    },
    {
      key: 'due',
      title: 'Due today',
      subtitle: 'Easy wins for staying warm.',
      icon: 'clock-outline',
      contacts: standardContacts.filter((contact) => contact.dueState === 'due'),
      color: getDueColor('due'),
    },
    {
      key: 'birthdays',
      title: 'Birthdays soon',
      subtitle: 'Prep a thoughtful note before the day arrives.',
      icon: 'cake-variant',
      contacts: birthdaySoon,
      color: colors.tertiary,
    },
    {
      key: 'upcoming',
      title: 'This week',
      subtitle: 'Upcoming check-ins in the next seven days.',
      icon: 'calendar-week',
      contacts: upcomingThisWeek,
      color: getDueColor('upcoming'),
    },
  ];
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState(() => contactsRepository.listByUrgency());
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    setContacts(contactsRepository.listByUrgency());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const sections = useMemo(() => buildAgendaSections(contacts, { tertiary: colors.tertiary }), [contacts, colors.tertiary]);
  const agendaContactIds = new Set(sections.flatMap((section) => section.contacts.map((contact) => contact.id)));
  const actionCount = agendaContactIds.size;
  const allContacts = contactsRepository.listAll();
  const allContactCount = allContacts.length;
  const nonArchivedContactCount = allContacts.filter((contact) => !contact.isArchived).length;
  const visibleContactCount = contacts.filter((contact) => !contact.isPaused && !contact.isArchived).length;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    requestAnimationFrame(() => {
      reload();
      setRefreshing(false);
    });
  }, [reload]);

  if (allContactCount === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Card>
          <Card.Content style={{ gap: 12, alignItems: 'center', paddingVertical: 28 }}>
            <Icon source="calendar-heart" size={34} color={colors.primary} />
            <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
              No agenda yet
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurfaceVariant, maxWidth: 280 }}>
              Add people to Orbit and this screen will become your daily relationship plan.
            </Text>
            <Link href="/contact/new" asChild>
              <Button mode="contained" icon="plus" style={{ marginTop: 4 }}>
                Add a person
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  if (visibleContactCount === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Card>
          <Card.Content style={{ gap: 12, alignItems: 'center', paddingVertical: 28 }}>
            <Icon source="pause-circle-outline" size={34} color={colors.primary} />
            <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
              No active agenda
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurfaceVariant, maxWidth: 280 }}>
              {nonArchivedContactCount > 0
                ? 'Your active people are paused, and archived people stay hidden from Today.'
                : 'Your people are archived, so Orbit will keep Today quiet until someone new is added.'}
            </Text>
            <Link href={nonArchivedContactCount > 0 ? '/people' : '/contact/new'} asChild>
              <Button
                mode="contained-tonal"
                icon={nonArchivedContactCount > 0 ? 'account-group' : 'plus'}
                style={{ marginTop: 4 }}
              >
                {nonArchivedContactCount > 0 ? 'Review people' : 'Add a person'}
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <Card style={{ backgroundColor: colors.primaryContainer }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>
            Today’s orbit
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onPrimaryContainer }}>
            {actionCount === 0
              ? 'No one is inside today’s focus window. Check People if you want to browse the full roster.'
              : `${actionCount} relationship touchpoint${actionCount === 1 ? '' : 's'} worth considering.`}
          </Text>
        </Card.Content>
      </Card>

      {sections.map((section) => (
        <Card key={section.key}>
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Icon source={section.icon} size={20} color={section.color} />
                <Text variant="titleMedium">{section.title}</Text>
              </View>
              <Chip compact style={{ backgroundColor: section.color + '18' }} textStyle={{ color: section.color }}>
                {section.contacts.length}
              </Chip>
            </View>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {section.subtitle}
            </Text>

            {section.contacts.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: colors.outline }}>
                Nothing here right now.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {section.contacts.map((contact) => {
                  const birthdayLabel = getBirthdayWindowLabel(contact);
                  const showQuickLog = contact.dueState === 'overdue' || contact.dueState === 'due';
                  return (
                    <View key={`${section.key}-${contact.id}`} style={styles.contactRowOuter}>
                      <Link href={`/contact/${contact.id}`} asChild>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${contact.name}'s contact details`}
                          style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.6 }]}
                        >
                          <View style={[styles.dot, { backgroundColor: section.color }]} />
                          <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" numberOfLines={1}>{contact.name}</Text>
                            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                              {birthdayLabel
                                ? `${formatDueLabel(getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil))} · ${birthdayLabel}`
                                : formatDueLabel(getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil))}
                            </Text>
                          </View>
                        </Pressable>
                      </Link>
                      {showQuickLog && (
                        <Link href={{ pathname: '/interaction/new', params: { contactId: contact.id } }} asChild>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Log an interaction with ${contact.name}`}
                            hitSlop={8}
                            style={({ pressed }) => [styles.quickButton, { backgroundColor: colors.primaryContainer }, pressed && { opacity: 0.6 }]}
                          >
                            <Icon source="plus" size={16} color={colors.primary} />
                          </Pressable>
                        </Link>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
