import { useLocalSearchParams } from 'expo-router';

import { BackLink, Screen, StatePanel } from '@/components/Brand';
import { UserProfileView } from '@/components/UserProfileView';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const usernameValue = Array.isArray(username) ? username[0] : username;

  if (!usernameValue) {
    return (
      <Screen>
        <BackLink href="/">Back</BackLink>
        <StatePanel title="Profile not found." />
      </Screen>
    );
  }

  return <UserProfileView username={usernameValue} backHref="/" backLabel="Back" />;
}
