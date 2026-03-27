import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { DEFAULT_RELATIONSHIP_TYPE, RELATIONSHIP_TYPES } from '@/lib/constants';
import { createContact } from '@/features/contacts/contactService';
import { BirthdayPicker } from '@/components/BirthdayPicker';

export default function NewContactScreen() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [relationshipType, setRelationshipType] = useState(DEFAULT_RELATIONSHIP_TYPE);
  const [cadence, setCadence] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    try {
      setIsSaving(true);
      setError(null);

      const social: Record<string, string> = {};
      if (instagram) social.instagram = instagram;
      if (twitter) social.twitter = twitter;
      if (linkedin) social.linkedin = linkedin;

      const contact = await createContact({
        name,
        nickname: nickname || null,
        relationshipType,
        cadence,
        notes: notes || null,
        birthday: birthday || null,
        phone: phone || null,
        email: email || null,
        socialJson: Object.keys(social).length > 0 ? JSON.stringify(social) : null,
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

      <Divider />

      <Text variant="titleMedium">Contact details</Text>

      <View style={{ gap: 12 }}>
        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+1 (555) 000-0000"
        />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="name@example.com"
        />
        <BirthdayPicker value={birthday} onChange={setBirthday} />
      </View>

      <Divider />

      <Text variant="titleMedium">Social</Text>
      <Text variant="bodySmall" style={{ color: '#888', marginTop: -8 }}>
        Optional — how you actually keep up with them
      </Text>

      <View style={{ gap: 12 }}>
        <TextInput
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
          placeholder="@username"
          left={<TextInput.Icon icon="instagram" />}
        />
        <TextInput
          label="X (Twitter)"
          value={twitter}
          onChangeText={setTwitter}
          autoCapitalize="none"
          placeholder="@username"
          left={<TextInput.Icon icon="twitter" />}
        />
        <TextInput
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          autoCapitalize="none"
          placeholder="username"
          left={<TextInput.Icon icon="linkedin" />}
        />
      </View>

      <Divider />

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
