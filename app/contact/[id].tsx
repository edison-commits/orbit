import { useCallback, useState } from 'react';
import { useLocalSearchParams, Link, useFocusEffect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, HelperText, Text } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { interactionsRepository } from '@/db/repositories/interactionsRepository';
import {
  clearContactSnooze,
  setContactArchived,
  setContactPaused,
  snoozeContact,
} from '@/features/contacts/contactService';
import { formatDaysSinceContact, formatDueLabel, formatOrbitDate, formatOrbitDateTime } from '@/lib/dates';
import { SNOOZE_OPTIONS } from '@/lib/reminders';
import type { InteractionTimelineItem } from '@/types/models';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState(() => contactsRepository.getById(id));
  const [recentInteractions, setRecentInteractions] = useState<InteractionTimelineItem[]>(() =>
    interactionsRepository.listForContact(id),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setContact(contactsRepository.getById(id));
      setRecentInteractions(interactionsRepository.listForContact(id));
    }, [id]),
  );

  async function handlePauseToggle() {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);
      const updated = await setContactPaused(contact.id, !contact.isPaused);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);
      const updated = await setContactArchived(contact.id, !contact.isArchived);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSnooze(days: number) {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);
      const updated = await snoozeContact(contact.id, days);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not snooze contact');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearSnooze() {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);
      const updated = await clearContactSnooze(contact.id);
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear snooze');
    } finally {
      setIsSaving(false);
    }
  }

  if (!contact) {
    return <Text style={{ padding: 16 }}>Contact not found.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall">{contact.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip compact>{contact.relationshipType}</Chip>
            <Chip compact>{contact.dueState}</Chip>
            {contact.isPaused ? <Chip compact>paused</Chip> : null}
            {contact.cadenceSnoozedUntil ? <Chip compact>snoozed</Chip> : null}
            {contact.isArchived ? <Chip compact>archived</Chip> : null}
          </View>
          <Text variant="bodyMedium">{formatDueLabel(contact.nextDueAt)}</Text>
          <Text variant="bodyMedium">Next due: {formatOrbitDate(contact.nextDueAt)}</Text>
          {contact.cadenceSnoozedUntil ? (
            <Text variant="bodyMedium">Snoozed until: {formatOrbitDate(contact.cadenceSnoozedUntil)}</Text>
          ) : null}
          <Text variant="bodyMedium">{formatDaysSinceContact(contact.lastInteractionAt)}</Text>
          <Text variant="bodyMedium">Last interaction: {formatOrbitDate(contact.lastInteractionAt)}</Text>
          <Text variant="bodyMedium">Cadence: every {contact.cadence} days</Text>
          {contact.nickname ? <Text variant="bodyMedium">Nickname: {contact.nickname}</Text> : null}
          {contact.notes ? <Text variant="bodyMedium">{contact.notes}</Text> : null}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Snooze</Text>
          <Text variant="bodyMedium">Need a little breathing room? Push this reminder out without pausing the relationship.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SNOOZE_OPTIONS.map((option) => (
              <Button
                key={option.key}
                mode="outlined"
                compact
                disabled={isSaving || contact.isPaused || contact.isArchived}
                onPress={() => handleSnooze(option.days)}
              >
                {option.label}
              </Button>
            ))}
            {contact.cadenceSnoozedUntil ? (
              <Button mode="text" compact disabled={isSaving} onPress={handleClearSnooze}>
                Clear snooze
              </Button>
            ) : null}
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Recent activity</Text>
          <Text variant="bodyMedium">A quick read on your latest moments together.</Text>
          {recentInteractions.length === 0 ? (
            <Text variant="bodyMedium">No interactions logged yet.</Text>
          ) : (
            recentInteractions.map((interaction) => (
              <View key={interaction.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {interaction.type ? <Chip compact>{interaction.type}</Chip> : null}
                  <Text variant="bodySmall">{formatOrbitDateTime(interaction.occurredAt)}</Text>
                </View>
                {interaction.otherContacts.length > 0 ? (
                  <Text variant="bodySmall">
                    With {interaction.otherContacts.map((otherContact) => otherContact.name).join(', ')}
                  </Text>
                ) : null}
                {interaction.note ? <Text variant="bodyMedium">{interaction.note}</Text> : null}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Link href={`/contact/edit/${contact.id}`} asChild>
        <Button mode="outlined">Edit person</Button>
      </Link>
      <Button mode="outlined" onPress={handlePauseToggle} disabled={isSaving}>
        {contact.isPaused ? 'Unpause cadence' : 'Pause cadence'}
      </Button>
      <Button mode="outlined" onPress={handleArchiveToggle} disabled={isSaving}>
        {contact.isArchived ? 'Unarchive person' : 'Archive person'}
      </Button>
      <Link href={{ pathname: '/interaction/new', params: { contactId: contact.id } }} asChild>
        <Button mode="contained" disabled={contact.isArchived}>Log interaction</Button>
      </Link>
      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>
    </ScrollView>
  );
}
