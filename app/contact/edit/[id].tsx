import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { updateContact } from '@/features/contacts/contactService';
import { RELATIONSHIP_TYPES } from '@/lib/constants';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState(() => contactsRepository.getById(id));
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState('friend');
  const [cadence, setCadence] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setContact(contactsRepository.getById(id));
    }, [id]),
  );

  useEffect(() => {
    if (!contact) return;
    setName(contact.name);
    setNickname(contact.nickname ?? '');
    setRelationshipType(contact.relationshipType);
    setCadence(contact.cadence);
    setNotes(contact.notes ?? '');
  }, [contact]);

  async function handleSave() {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateContact({
        id: contact.id,
        name,
        nickname: nickname || null,
        relationshipType,
        cadence,
        notes: notes || null,
      });
      router.replace(`/contact/${contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact');
    } finally {
      setIsSaving(false);
    }
  }

  if (!contact) {
    return <Text style={{ padding: 16 }}>Contact not found.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall">Edit person</Text>
      <Text variant="bodyMedium">Tweak the details without losing the thread.</Text>

      <TextInput label="Name" value={name} onChangeText={setName} autoFocus />
      <TextInput label="Nickname" value={nickname} onChangeText={setNickname} />

      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">Relationship</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RELATIONSHIP_TYPES.map((option) => (
            <Chip key={option} selected={relationshipType === option} onPress={() => setRelationshipType(option)}>
              {option}
            </Chip>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">Cadence</Text>
        <Text variant="bodyMedium">Adjust how often Orbit brings them back to the top.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[7, 14, 30, 60, 90].map((option) => (
            <Chip key={option} selected={cadence === option} onPress={() => setCadence(option)}>
              Every {option} days
            </Chip>
          ))}
        </View>
      </View>

      <TextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        placeholder="How you met · Likes · Dislikes · Allergies · Hobbies · What matters · Things to remember…"
      />

      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>

      <Button mode="contained" onPress={handleSave} disabled={isSaving}>
        Save changes
      </Button>
    </ScrollView>
  );
}
