import { Linking, ScrollView, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function SupportScreen() { return <ScrollView contentContainerStyle={styles.container}><Text variant="displaySmall">Orbit support</Text><Text variant="bodyLarge" style={styles.body}>Need help with reminders, importing contacts, or restoring a backup? We can help you understand the safest next step.</Text><Button mode="contained" onPress={() => Linking.openURL('mailto:hello@orbitcontacts.app?subject=Orbit%20support')}>Email support</Button><Text variant="bodySmall" style={styles.note}>Please do not send passwords, backup keys, or a full address book by email.</Text></ScrollView>; }
const styles = StyleSheet.create({ container: { padding: 24, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' }, body: { lineHeight: 27 }, note: { color: '#667085', lineHeight: 19 } });
