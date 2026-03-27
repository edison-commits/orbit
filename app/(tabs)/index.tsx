import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { getHomeAggregates } from '@/features/home/homeService';
import { formatOrbitDate } from '@/lib/dates';

export default function HomeScreen() {
  const [aggregates, setAggregates] = useState(() => getHomeAggregates());

  useFocusEffect(
    useCallback(() => {
      setAggregates(getHomeAggregates());
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Card.Content>
          <Text variant="headlineSmall">Home</Text>
          <Text variant="bodyMedium">A quick read on who needs love now, today, and soon.</Text>
        </Card.Content>
      </Card>

      <View style={{ gap: 12 }}>
        {aggregates.map((aggregate) => (
          <Card key={aggregate.dueState}>
            <Card.Content style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text variant="titleMedium">{aggregate.title}</Text>
                <Chip compact>{aggregate.count}</Chip>
              </View>
              <Text variant="bodyMedium">{aggregate.summary}</Text>
              {aggregate.contacts.map((contact) => (
                <View
                  key={contact.id}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                >
                  <Text variant="bodySmall">{contact.name}</Text>
                  <Text variant="bodySmall">{formatOrbitDate(contact.nextDueAt)}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}
      </View>

      <Link href="/contact/new" asChild>
        <Button mode="contained">Add a person</Button>
      </Link>
    </ScrollView>
  );
}
