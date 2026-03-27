import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { getHomeAggregates } from '@/features/home/homeService';
import { formatDueLabel, getDueColor } from '@/lib/dates';
import { DUE_COLORS } from '@/lib/theme';

const SECTION_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due: 'Due today',
  upcoming: 'Upcoming',
};

export default function HomeScreen() {
  const [aggregates, setAggregates] = useState(() => getHomeAggregates());

  useFocusEffect(
    useCallback(() => {
      setAggregates(getHomeAggregates());
    }, []),
  );

  const totalContacts = aggregates.reduce((sum, a) => sum + a.count, 0);

  if (totalContacts === 0) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text variant="bodyMedium" style={{ color: '#666' }}>
          Who needs you — now, today, and soon.
        </Text>
        <Card>
          <Card.Content style={{ gap: 12, alignItems: 'center', paddingVertical: 24 }}>
            <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
              Your orbit is empty
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: '#666', maxWidth: 260 }}>
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="bodyMedium" style={{ color: '#666' }}>
        Who needs you — now, today, and soon.
      </Text>

      <View style={{ gap: 12 }}>
        {aggregates.map((aggregate) => {
          const color = getDueColor(aggregate.dueState);
          return (
            <Card key={aggregate.dueState}>
              <Card.Content style={{ gap: 10 }}>
                {/* Header row */}
                <View style={styles.header}>
                  <View style={styles.labelRow}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text variant="titleMedium">{SECTION_LABELS[aggregate.dueState] ?? aggregate.dueState}</Text>
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
                <Text variant="bodyMedium" style={{ color: '#555' }}>
                  {aggregate.summary}
                </Text>

                {/* Contact list */}
                {aggregate.contacts.length > 0 && (
                  <View style={{ gap: 6, marginTop: 2 }}>
                    {aggregate.contacts.map((contact) => (
                      <Link key={contact.id} href={`/contact/${contact.id}`} asChild>
                        <View style={styles.contactRow}>
                          <View style={[styles.miniDot, { backgroundColor: color }]} />
                          <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                            {contact.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#999' }}>
                            {formatDueLabel(contact.nextDueAt)}
                          </Text>
                        </View>
                      </Link>
                    ))}
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
