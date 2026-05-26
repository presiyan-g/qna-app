import type { Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

export const palette = {
  paper: '#FAF6EC',
  card: '#FFFFFF',
  line: '#E9E2CE',
  primary: '#1F4032',
  primarySoft: '#F4F1E3',
  primaryHover: '#193428',
  ink: '#232220',
  muted: '#6B6B66',
  accent: '#D6A12B',
  accentHover: '#BE8C1F',
  // Action color family — mirrors web's --color-action-* tokens.
  // Clay is the warm secondary commit (Join / Create / Step away);
  // lake is the cool tertiary / informational variant.
  actionClay: '#C2543A',
  actionClaySoft: '#F8E6DE',
  actionClayHover: '#A9472F',
  actionLake: '#3A6E8F',
  actionLakeSoft: '#E3ECF2',
  actionLakeHover: '#2F5C77',
  danger: '#C2543A',
  dangerHover: '#913B26',
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
