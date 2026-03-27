import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { saveInteraction } from '@/features/interactions/interactionService';
import { INTERACTION_TYPES } from '@/lib/constants';

export default function NewInteractionScreen() {
  const params = useLocalSearchParams<{ contactId?: string }>();
  const [contacts, setContacts] = useState(() => contactsRepository.listByUrgency());
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(() => (params.contactId ? [params.contactId] : []));
  const [interactionType, setInteractionType] = useState<string | null>('text');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContacts(contactsRepository.listByUrgency());
  }, []);

  useEffect(() => {
    if (params.contactId) {
      setSelectedContactIds((current) => (current.includes(params.contactId!) ? current : [params.contactId!, ...current]));
    }
  }, [params.contactId]);

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId) ? current.filter((value) => value !== contactId) : [...current, contactId],
    );
  }

  async function handleSave() {
    if (selectedContactIds.length === 0) {
      setError('Choose at least one person to log this interaction.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await saveInteraction({
        type: interactionType,
        note: note || null,
        contactIds: selectedContactIds,
      });
      if (selectedContactIds.length === 1) {
        router.replace(`/contact/${selectedContactIds[0]}`);
      } else {
        router.replace('/(tabs)/people');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save interaction');
    } finally {
      setIsSaving(false);
    }
  }

  const selectedContacts = contacts.filter((contact) => selectedContactIds.includes(contact.id));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall">Log interaction</Text>
      <Text variant="bodyMedium">Capture the moment and let Orbit quietly reset the follow-up rhythm.</Text>

      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">People</Text>
        <Text variant="bodyMedium">
          Choose everyone who was part of this moment. Orbit will update each selected cadence after save.
        </Text>
        {selectedContacts.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selectedContacts.map((contact) => (
              <Chip key={contact.id} onClose={() => toggleContact(contact.id)}>
                {contact.name}
              </Chip>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 8 }}>
          {contacts.map((contact) => {
            const checked = selectedContactIds.includes(contact.id);
            return (
              <Chip
                key={contact.id}
                selected={checked}
                onPress={() => toggleContact(contact.id)}
                showSelectedCheck={checked}
              >
                {`${contact.name} · ${contact.dueState}`}
              </Chip>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTERACTION_TYPES.map((type) => (
            <Chip key={type} selected={interactionType === type} onPress={() => setInteractionType(type)}>
              {type}
            </Chip>
          ))}
        </View>
      </View>

      <TextInput
        label="Note"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
        placeholder="A little context for future you..."
      />

      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>

      <Button mode="contained" onPress={handleSave} disabled={isSaving}>
        Save interaction{selectedContactIds.length > 1 ? ` for ${selectedContactIds.length}` : ''}
      </Button>
    </ScrollView>
  );
}
