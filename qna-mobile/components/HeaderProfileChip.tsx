import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';

export function HeaderProfileChip() {
  const router = useRouter();
  const { loading, user } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Pressable
        accessibilityLabel={`Open ${user.username}'s profile`}
        accessibilityRole="link"
        onPress={() =>
          router.push({
            pathname: '/users/[username]',
            params: { username: user.username },
          })
        }
        style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
      >
        <Text style={styles.chipText}>@{user.username}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.signedOutActions}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/register')}
        style={({ pressed }) => [styles.joinButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.joinText}>Join</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/login')}
        style={({ pressed }) => [styles.signIn, pressed ? styles.pressed : null]}
      >
        <Text style={styles.signInText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  signedOutActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinText: {
    color: palette.paper,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  signIn: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signInText: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
