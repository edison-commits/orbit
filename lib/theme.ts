import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const orbitTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7C5CFC',
    onPrimary: '#FFFFFF',
    secondary: '#F4B183',
    background: '#FCF7F3',
    surface: '#FFFFFF',
    surfaceVariant: '#F6EEE8',
    outline: '#D8CBBF',
    error: '#C65B4B',
  },
};
