import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { navigationTheme, palette } from '@/constants/theme';
import { AuthProvider } from '@/services/auth/AuthContext';

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.paper },
            headerBackTitle: 'Back',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: palette.paper,
              borderBottomColor: palette.line,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
            headerTintColor: palette.primary,
            headerTitleStyle: {
              color: palette.primary,
              fontSize: 17,
              fontWeight: '800',
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="communities" options={{ title: 'Communities' }} />
          <Stack.Screen name="communities/[slug]" options={{ title: 'Community' }} />
          <Stack.Screen name="login" options={{ title: 'Sign in' }} />
          <Stack.Screen name="register" options={{ title: 'Join Quorum' }} />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}
