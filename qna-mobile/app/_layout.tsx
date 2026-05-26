import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { navigationTheme, palette } from '@/constants/theme';
import { AuthProvider } from '@/services/auth/AuthContext';

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        {/* Headers are intentionally suppressed everywhere — screens own
            their own back links inside the content so we never duplicate
            the brand chrome with a system header. */}
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.paper },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}
