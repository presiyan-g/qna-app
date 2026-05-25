import { useLocalSearchParams } from 'expo-router';

import { Screen, StatePanel } from '@/components/Brand';
import { UserProfileView } from '@/components/UserProfileView';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const usernameValue = Array.isArray(username) ? username[0] : username;

  if (!usernameValue) {
    return (
      <Screen>
        <StatePanel title="Profile not found." />
      </Screen>
    );
  }

  return <UserProfileView username={usernameValue} />;
}
