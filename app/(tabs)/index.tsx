import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text, Icon, useTheme } from 'react-native-paper';
import { getHomeAggregates } from '@/features/home/homeService';
import { contactsRepository, type ContactsSummaryCounts } from '@/db/repositories/contactsRepository';
import { formatDueLabel, getDueColor, getDaysUntilBirthday } from '@/lib/dates';
import { DUE_COLORS } from '@/lib/theme';

const SECTION_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due: 'Due today',
  upcoming: 'Upcoming',
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const [aggregates, setAggregates] = useState(() => getHomeAggregates());
  const [stats, setStats] = useState<ContactsSummaryCounts>(() => contactsRepository.getSummaryCounts());

  useFocusEffect(
    useCallback(() => {
      setAggregates(getHomeAggregates());
      setStats(contactsRepository.getSummaryCounts());
    }, []),
  );

  const totalContactCount = aggregates.reduce((sum, a) => sum + a.count, 0);

  if (totalContactCount === 0) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          Who needs you — now, today, and soon.
        </Text>
        <Card>
          <Card.Content style={{ gap: 12, alignItems: 'center', paddingVertical: 24 }}>
            <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
              Your orbit is empty
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurfaceVariant, maxWidth: 260 }}>
              Add the people you want to stay connected with. Orbit handles the rest.
            </Text>
            <Link href="/contact/new" asChild>
              <Button mode="contained" icon="plus" style={{ marginTop: 4 }}>
                Add your first person
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  const totalContacts = (stats.overdue ?? 0) + (stats.due ?? 0) + (stats.upcoming ?? 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        Who needs you — now, today, and soon.
      </Text>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.statCard, { backgroundColor: colors.primaryContainer }]}>
          <Text variant="headlineSmall" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>{totalContacts}</Text>
          <Text variant="labelSmall" style={{ color: colors.onPrimaryContainer }}>People</Text>
        </View>
        {(stats.overdue ?? 0) > 0 && (
          <View style={[styles.statCard, { backgroundColor: DUE_COLORS.overdue + '18' }]}>
            <Text variant="headlineSmall" style={{ color: DUE_COLORS.overdue, fontWeight: '700' }}>{stats.overdue}</Text>
            <Text variant="labelSmall" style={{ color: DUE_COLORS.overdue }}>Overdue</Text>
          </View>
        )}
        {(stats.due ?? 0) > 0 && (
          <View style={[styles.statCard, { backgroundColor: DUE_COLORS.due + '18' }]}>
            <Text variant="headlineSmall" style={{ color: DUE_COLORS.due, fontWeight: '700' }}>{stats.due}</Text>
            <Text variant="labelSmall" style={{ color: DUE_COLORS.due }}>Due today</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 12 }}>
        {aggregates.map((aggregate) => {
          const isBirthday = aggregate.dueState === 'birthday';
          const color = isBirthday ? colors.tertiary : getDueColor(aggregate.dueState);
          const label = isBirthday ? aggregate.title : (SECTION_LABELS[aggregate.dueState] ?? aggregate.dueState);

          return (
            <Card key={aggregate.dueState}>
              <Card.Content style={{ gap: 10 }}>
                {/* Header row */}
                <View style={styles.header}>
                  <View style={styles.labelRow}>
                    {isBirthday ? (
                      <Icon source="cake-variant" size={18} color={color} />
                    ) : (
                      <View style={[styles.dot, { backgroundColor: color }]} />
                    )}
                    <Text variant="titleMedium">{label}</Text>
                  </View>
                  <Chip
                    compact
                    style={[styles.countChip, { backgroundColor: color + '18' }]}
                    textStyle={{ color }}
                  >
                    {aggregate.count}
                  </Chip>
                </View>

                {/* Summary line */}
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                  {aggregate.summary}
                </Text>

                {/* Contact list */}
                {aggregate.contacts.length > 0 && (
                  <View style={{ gap: 6, marginTop: 2 }}>
                    {aggregate.contacts.map((contact) => {
                      const birthdayDays = isBirthday && 'birthdayDays' in contact
                        ? (contact as any).birthdayDays
                        : null;
                      const showQuickLog = contact.dueState === 'overdue' || contact.dueState === 'due';
                      return (
                        <View key={contact.id} style={styles.contactRowOuter}>
                          <Link href={`/contact/${contact.id}`} asChild>
                            <Pressable
                              style={({ pressed }) => [
                                styles.contactRow,
                                pressed && { opacity: 0.6 },
                              ]}
                            >
                              {isBirthday ? (
                                <Icon source="cake-variant" size={14} color={color} style={{ marginTop: 1 }} />
                              ) : (
                                <View style={[styles.miniDot, { backgroundColor: color }]} />
                              )}
                              <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                                {contact.name}
                              </Text>
                              {birthdayDays !== null ? (
                                <Text variant="bodySmall" style={{ color: colors.outline }}>
                                  {birthdayDays === 0 ? 'today' : birthdayDays === 1 ? 'tomorrow' : `in ${birthdayDays}d`}
                                </Text>
                              ) : (
                                <Text variant="bodySmall" style={{ color: colors.outline }}>
                                  {formatDueLabel(contact.nextDueAt)}
                                </Text>
                              )}
                            </Pressable>
                          </Link>
                          {showQuickLog && (
                            <Link href={{ pathname: '/interaction/new', params: { contactId: contact.id } }} asChild>
                              <Pressable
                                hitSlop={8}
                                style={({ pressed }) => [
                                  styles.quickLogBtn,
                                  { backgroundColor: colors.primaryContainer },
                                  pressed && { opacity: 0.6 },
                                ]}
                              >
                                <Icon source="plus" size={14} color={colors.primary} />
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
          );
        })}
      </View>

      <Link href="/contact/new" asChild style={{ marginTop: 4 }}>
        <Button mode="contained">Add a person</Button>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 1,
    flexShrink: 0,
  },
  countChip: {
    borderRadius: 12,
  },
  contactRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 2,
  },
  quickLogBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 2,
  },
});
