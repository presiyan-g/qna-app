import type { Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

export const palette = {
  paper: '#FAF6EC',
  card: '#FFFFFF',
  line: '#E9E2CE',
  primary: '#1F4032',
  primarySoft: '#F4F1E3',
  ink: '#232220',
  muted: '#6B6B66',
  accent: '#D6A12B',
} as const;

export const fonts = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  }),
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, serif',
  }),
} as const;

export const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: palette.primary,
    background: palette.paper,
    card: palette.paper,
    text: palette.ink,
    border: palette.line,
    notification: palette.accent,
  },
  fonts: {
    regular: {
      fontFamily: fonts.sans,
      fontWeight: '400',
    },
    medium: {
      fontFamily: fonts.sans,
      fontWeight: '600',
    },
    bold: {
      fontFamily: fonts.sans,
      fontWeight: '700',
    },
    heavy: {
      fontFamily: fonts.sans,
      fontWeight: '800',
    },
  },
};
