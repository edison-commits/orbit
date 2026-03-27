import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { DEFAULT_RELATIONSHIP_TYPE, RELATIONSHIP_TYPES } from '@/lib/constants';
import { createContact } from '@/features/contacts/contactService';

export default function NewContactScreen() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationshipType, setRelationshipType] = useState(DEFAULT_RELATIONSHIP_TYPE);
  const [cadence, setCadence] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    try {
      setIsSaving(true);
      setError(null);
      const contact = await createContact({
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall">Add a person</Text>
      <Text variant="bodyMedium">Just enough detail to remember who matters and when to reach back out.</Text>

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
        <Text variant="bodyMedium">How often should Orbit nudge you to reconnect?</Text>
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
        Save contact
      </Button>
    </ScrollView>
  );
}
