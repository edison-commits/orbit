import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { ScrollView, View, Image, Pressable, StyleSheet } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { updateContact } from '@/features/contacts/contactService';
import { RELATIONSHIP_TYPES } from '@/lib/constants';
import { orbitTheme } from '@/lib/theme';
import type { Contact } from '@/types/models';
import { BirthdayPicker } from '@/components/BirthdayPicker';

type SocialData = {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
};

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(() => contactsRepository.getById(id));
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
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
    setPhotoUri(contact.photoUri ?? null);
    setRelationshipType(contact.relationshipType);
    setCadence(contact.cadence);
    setNotes(contact.notes ?? '');
    setPhone(contact.phone ?? '');
    setEmail(contact.email ?? '');
    setBirthday(contact.birthday ?? '');
    try {
      const social: SocialData = contact.socialJson ? JSON.parse(contact.socialJson) : {};
      setInstagram(social.instagram ?? '');
      setTwitter(social.twitter ?? '');
      setLinkedin(social.linkedin ?? '');
    } catch {
      setInstagram('');
      setTwitter('');
      setLinkedin('');
    }
  }, [contact]);

  async function handlePickPhoto() {
    const { pickImageAsync } = await import('@/lib/imagePicker');
    const uri = await pickImageAsync();
    if (uri) setPhotoUri(uri);
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
  }

  async function handleSave() {
    if (!contact) return;

    try {
      setIsSaving(true);
      setError(null);

      const social: SocialData = {};
      if (instagram) social.instagram = instagram;
      if (twitter) social.twitter = twitter;
      if (linkedin) social.linkedin = linkedin;

      await updateContact({
        id: contact.id,
        name,
        nickname: nickname || null,
        photoUri,
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

  if (!contact) {
    return <Text style={{ padding: 16 }}>Contact not found.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text variant="headlineSmall">Edit person</Text>
      <Text variant="bodyMedium">Tweak the details without losing the thread.</Text>

      {/* Photo */}
      <View style={styles_edit.avatarSection}>
        <Pressable onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles_edit.avatarPhoto} />
          ) : (
            <View style={[styles_edit.avatarPlaceholder, { backgroundColor: orbitTheme.colors.primaryContainer }]}>
              <Text style={{ color: orbitTheme.colors.onPrimaryContainer, fontSize: 22, fontWeight: '700' }}>
                {name[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <Button mode="text" compact onPress={handlePickPhoto}>
            {photoUri ? 'Change' : 'Add photo'}
          </Button>
          {photoUri ? (
            <Button mode="text" compact onPress={handleRemovePhoto}>
              Remove
            </Button>
          ) : null}
        </View>
      </View>

      <TextInput label="Name" value={name} onChangeText={setName} />
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

const styles_edit = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    gap: 4,
  },
  avatarPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
