import { Linking, ScrollView, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function ContactScreen() { return <ScrollView contentContainerStyle={styles.container}><Text variant="displaySmall">Talk with the Orbit team</Text><Text variant="bodyLarge" style={styles.body}>Orbit is being shaped with people who want a more intentional way to stay in touch. Join the private beta or send a product question.</Text><Button mode="contained" onPress={() => Linking.openURL('mailto:hello@orbitcontacts.app?subject=Orbit%20private%20beta')}>Join the private beta</Button><Text variant="bodySmall" style={styles.note}>No payment or account is created by this button; it opens your email client.</Text></ScrollView>; }
const styles = StyleSheet.create({ container: { padding: 24, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' }, body: { lineHeight: 27 }, note: { color: '#667085', lineHeight: 19 } });
