import { useColorScheme } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { orbitTheme, orbitDarkTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  const isDark = colors.background === orbitDarkTheme.colors.background;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Colored top strip */}
      <View style={[styles.topStrip, { backgroundColor: colors.primary }]} />
      <Tabs
        screenOptions={{
          headerTitleAlign: 'left',
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface }],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.onSurfaceVariant,
          tabBarLabelStyle: styles.tabLabel,
          headerStyle: [styles.header, { backgroundColor: colors.primary }],
          headerTitleStyle: [styles.headerTitle, { color: colors.onPrimary }],
          headerTintColor: colors.onPrimary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            headerTitle: 'Orbit',
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'People',
            tabBarLabel: 'People',
            headerTitle: 'People',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            headerTitle: 'Settings',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStrip: {
    height: 4,
  },
  tabBar: {
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: 56,
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  header: {
  },
  headerTitle: {
    fontWeight: '700' as const,
    fontSize: 18,
  },
});
