import { StyleSheet, View } from 'react-native';

import {
  BodyText,
  BrandButton,
  Eyebrow,
  Heading,
  Screen,
  StatePanel,
} from '@/components/Brand';
import { UserProfileView } from '@/components/UserProfileView';
import { palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';

/**
 * Profile tab.
 *
 * Signed-in viewers see their own profile rendered inline (inside the tab
 * navigator) — so the tab bar stays visible and there's no back button.
 *
 * Signed-out viewers see a CTA card with Sign in / Join buttons. The tab bar
 * stays visible so they can navigate elsewhere without auth.
 */
export default function ProfileTab() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <Screen>
        <StatePanel title="Loading…" />
      </Screen>
    );
  }

  if (user) {
    return <UserProfileView username={user.username} />;
  }

  return (
    <Screen>
      <View style={styles.card}>
        <Eyebrow>Profile</Eyebrow>
        <Heading compact accent="communities.">
          Sign in to track your
        </Heading>
        <BodyText>
          Create an account to join communities, answer daily questions, and
          climb the leaderboards.
        </BodyText>
        <View style={styles.actions}>
          <BrandButton variant="clay" href="/register">
            Join Quorum
          </BrandButton>
          <BrandButton variant="secondary" href="/login">
            Sign in
          </BrandButton>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginTop: 24,
    padding: 24,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
});
