import { Link } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

const bullets = [
  ['Remember the people who matter', 'Keep a lightweight relationship list that is yours, not a noisy feed.'],
  ['Know who needs a check-in', 'Today, overdue, upcoming, birthdays, and weekly review in one calm view.'],
  ['Start small and stay private', 'Add one person, set a cadence, and keep your relationship notes on your device.'],
];

export default function LandingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="labelLarge" style={styles.kicker}>A quieter relationship tracker</Text>
      <Text variant="displaySmall" style={styles.title}>Keep your people in orbit.</Text>
      <Text variant="bodyLarge" style={styles.lede}>Orbit helps you remember to reach out without turning relationships into a productivity contest.</Text>
      <Link href="/" asChild><Button mode="contained" style={styles.primary}>Open Orbit</Button></Link>
      <Button mode="outlined" onPress={() => Linking.openURL('mailto:hello@orbitcontacts.app?subject=Orbit%20waitlist')}>Join the private beta</Button>
      <View style={styles.cards}>{bullets.map(([title, text]) => <Card key={title}><Card.Content><Text variant="titleMedium">{title}</Text><Text variant="bodyMedium" style={styles.cardText}>{text}</Text></Card.Content></Card>)}</View>
      <Text variant="bodySmall" style={styles.note}>Orbit is local-first. The public preview contains no account flow and makes no claim that a message or reminder was sent.</Text>
      <View style={styles.links}><Link href="/privacy" asChild><Button compact>Privacy</Button></Link><Link href="/support" asChild><Button compact>Support</Button></Link><Link href="/contact" asChild><Button compact>Contact</Button></Link></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { padding: 24, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' }, kicker: { color: '#7C5CFC', letterSpacing: 1.4, textTransform: 'uppercase' }, title: { fontWeight: '800', letterSpacing: -1.2 }, lede: { lineHeight: 28, maxWidth: 620 }, primary: { marginTop: 8 }, cards: { gap: 12, marginTop: 18 }, cardText: { marginTop: 8, lineHeight: 22 }, note: { color: '#667085', lineHeight: 19, marginTop: 10 }, links: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 } });
