import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const orbitTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7C5CFC',
    onPrimary: '#FFFFFF',
    secondary: '#F4B183',
    background: '#F7F5FF',      // subtle lavender tint
    surface: '#FFFFFF',
    surfaceVariant: '#EDE9FE', // soft purple tint for card chips
    outline: '#D8CBBF',
    error: '#C65B4B',
  },
};

// Traffic-light urgency palette
export const DUE_COLORS = {
  overdue: '#C65B4B',   // red
  due:     '#E07B39',   // amber
  upcoming: '#5A9E7C',  // green
  paused:  '#9CA3AF',   // gray
  snoozed: '#9CA3AF',   // gray
} as const;
