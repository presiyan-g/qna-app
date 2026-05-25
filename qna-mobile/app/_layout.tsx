import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { HeaderBackButton } from '@/components/HeaderBackButton';
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
            ...(Platform.OS === 'web'
              ? {
                  headerLeft: () => <HeaderBackButton />,
                  headerLeftContainerStyle: { paddingLeft: 16 },
                }
              : null),
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
          {/* The (tabs) group owns the entire signed-in / signed-out
              experience and renders its own per-tab headers. Detail screens
              (community, question, public profile) live inside the group too
              so the tab bar stays visible across navigation. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Auth screens stay outside the tabs — full-screen focused flows. */}
          <Stack.Screen name="login" options={{ title: 'Sign in' }} />
          <Stack.Screen name="register" options={{ title: 'Join Quorum' }} />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}
