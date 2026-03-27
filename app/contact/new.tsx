import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  View,
  Alert,
  StyleSheet,
  Modal,
  Text as RNText,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { createContact } from '@/features/contacts/contactService';
import { BirthdayPicker } from '@/components/BirthdayPicker';
import { RELATIONSHIP_TYPES, CADENCE_OPTIONS_DAYS, DEFAULT_RELATIONSHIP_TYPE } from '@/lib/constants';
import { orbitTheme } from '@/lib/theme';

// Lazy-load image picker to avoid bundling it until the form is opened
async function openImagePicker(): Promise<string | null> {
  const { pickImageAsync } = await import('@/lib/imagePicker');
  return pickImageAsync();
}

export default function NewContactScreen() {
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState(DEFAULT_RELATIONSHIP_TYPE);
  const [cadence, setCadence] = useState(30);
  const [showExtras, setShowExtras] = useState(false);
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handlePickPhoto() {
    const uri = await openImagePicker();
    if (uri) setPhotoUri(uri);
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('A name is required to save.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);

      const social: Record<string, string> = {};
      if (instagram) social.instagram = instagram;
      if (twitter) social.twitter = twitter;
      if (linkedin) social.linkedin = linkedin;

      const contact = await createContact({
        name: name.trim(),
        nickname: nickname.trim() || null,
        relationshipType,
        cadence,
        notes: notes.trim() || null,
        birthday: birthday || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        socialJson: Object.keys(social).length > 0 ? JSON.stringify(social) : null,
        photoUri: photoUri,
      });
      router.replace(`/contact/${contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact');
    } finally {
      setIsSaving(false);
    }
  }

  const avatarInitial = name.trim()[0]?.toUpperCase() ?? '?';
  const canSave = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      <Text variant="headlineSmall">Add a person</Text>

      {/* ── Photo + Name ─────────────────────────────── */}
      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickPhoto} style={styles.avatarWrapper}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: orbitTheme.colors.primaryContainer }]}>
              <Text style={[styles.avatarInitial, { color: orbitTheme.colors.onPrimaryContainer }]}>
                {avatarInitial}
              </Text>
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarOverlayText}>{photoUri ? 'Change' : 'Add photo'}</Text>
          </View>
        </Pressable>
        {photoUri && (
          <Button mode="text" compact onPress={handleRemovePhoto} style={{ marginTop: 4 }}>
            Remove
          </Button>
        )}
      </View>

      <TextInput
        label="Name"
        value={name}
        onChangeText={(t) => { setName(t); setError(null); }}
        autoFocus
        style={{ backgroundColor: '#fff' }}
      />

      {/* ── Relationship ─────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">Relationship</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RELATIONSHIP_TYPES.map((option) => (
            <Chip
              key={option}
              selected={relationshipType === option}
              onPress={() => setRelationshipType(option)}
            >
              {option}
            </Chip>
          ))}
        </View>
      </View>

      {/* ── Cadence ──────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <Text variant="titleMedium">Check-in every</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CADENCE_OPTIONS_DAYS.map((option) => (
            <Chip
              key={option}
              selected={cadence === option}
              onPress={() => setCadence(option)}
            >
              {option}d
            </Chip>
          ))}
        </View>
      </View>

      {/* ── More details (expandable) ───────────────── */}
      <Pressable onPress={() => setShowExtras(!showExtras)} style={styles.extrasToggle}>
        <Text variant="titleMedium" style={{ color: orbitTheme.colors.primary }}>
          {showExtras ? '− Less' : '+ More details'}
        </Text>
      </Pressable>

      {showExtras && (
        <View style={{ gap: 16 }}>
          <Divider />

          <TextInput
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            style={{ backgroundColor: '#fff' }}
          />

          {/* Contact info */}
          <View style={{ gap: 12 }}>
            <Text variant="titleMedium">Contact</Text>
            <TextInput
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={{ backgroundColor: '#fff' }}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ backgroundColor: '#fff' }}
            />
            <BirthdayPicker value={birthday} onChange={setBirthday} />
          </View>

          {/* Social */}
          <View style={{ gap: 12 }}>
            <Text variant="titleMedium">Social</Text>
            <TextInput
              label="Instagram"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              left={<TextInput.Icon icon="instagram" />}
              style={{ backgroundColor: '#fff' }}
            />
            <TextInput
              label="X (Twitter)"
              value={twitter}
              onChangeText={setTwitter}
              autoCapitalize="none"
              left={<TextInput.Icon icon="twitter" />}
              style={{ backgroundColor: '#fff' }}
            />
            <TextInput
              label="LinkedIn"
              value={linkedin}
              onChangeText={setLinkedin}
              autoCapitalize="none"
              left={<TextInput.Icon icon="linkedin" />}
              style={{ backgroundColor: '#fff' }}
            />
          </View>

          {/* Notes */}
          <View style={{ gap: 8 }}>
            <Text variant="titleMedium">Notes</Text>
            <TextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="How you met · Likes · Dislikes · Allergies · Hobbies · Things to remember…"
              style={{ backgroundColor: '#fff' }}
            />
          </View>
        </View>
      )}

      {/* ── Save ─────────────────────────────────────── */}
      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={isSaving || !canSave}
        loading={isSaving}
      >
        Save contact
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    paddingVertical: 4,
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  extrasToggle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
