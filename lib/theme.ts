import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';

export const orbitTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7C5CFC',
    onPrimary: '#FFFFFF',
    secondary: '#F4B183',
    background: '#F7F5FF',       // subtle lavender tint
    surface: '#FFFFFF',
    surfaceVariant: '#EDE9FE',  // soft purple tint for card chips
    outline: '#D8CBBF',
    error: '#C65B4B',
  },
};

export const orbitDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A78BFA',          // softer purple for dark bg
    onPrimary: '#1E1B2E',
    secondary: '#F4B183',
    background: '#12111A',       // near-black with purple undertone
    surface: '#1E1B2E',          // dark purple-gray
    surfaceVariant: '#2D2A3E',   // slightly lighter surface
    outline: '#4A4760',
    error: '#FF7B6B',
  },
};

// Traffic-light urgency palette — same for both modes
export const DUE_COLORS = {
  overdue:  '#FF7B6B',  // coral red (visible on dark)
  due:      '#FFB347',  // amber
  upcoming: '#6FCF97', // green
  paused:   '#9CA3AF', // gray
  snoozed:  '#9CA3AF', // gray
  birthday: '#EC4899', // pink
} as const;
