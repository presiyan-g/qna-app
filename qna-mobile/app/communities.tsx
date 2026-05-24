import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { BodyText, BrandButton, Heading, Screen, StatePanel } from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthContext';
import { useRuntimeApiUrl } from '@/services/config';
import {
  CommunitiesApiError,
  type Community,
  createCommunitiesClient,
} from '@/services/communities/api';
import { formatCommunityCadence } from '@/services/communities/format';

const PAGE_SIZE = 24;

export default function CommunitiesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const apiUrl = useRuntimeApiUrl();
  const communitiesClient = useMemo(() => createCommunitiesClient({ apiUrl }), [apiUrl]);

  const loadCommunities = useCallback(async ({
    isActive = () => true,
    showSpinner = true,
  }: {
    isActive?: () => boolean;
    showSpinner?: boolean;
  } = {}) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const result = await communitiesClient.list({ limit: PAGE_SIZE, offset: 0, token });
      if (!isActive()) return;
      setCommunities(result.items);
    } catch (err) {
      if (!isActive()) return;
      setError(err instanceof CommunitiesApiError ? err.message : 'Unable to load communities.');
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [communitiesClient, token]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommunities({ showSpinner: false });
    setRefreshing(false);
  }, [loadCommunities]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCommunities({ isActive: () => active });

      return () => {
        active = false;
      };
    }, [loadCommunities]),
  );

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={styles.content}
        data={communities}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.copy}>
            <Heading compact>Pick your daily room.</Heading>
            <BodyText>
              Browse active communities, open a detail page, and join when you are ready.
            </BodyText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <StatePanel title="Loading communities..." />
          ) : error ? (
            <StatePanel title={error}>
              <BrandButton variant="secondary" onPress={loadCommunities}>
                Retry
              </BrandButton>
            </StatePanel>
          ) : (
            <StatePanel title="No active communities yet." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/communities/${item.slug}`)}
            style={({ pressed }) => [styles.communityCard, pressed ? styles.pressed : null]}
          >
            <View style={styles.communityHeader}>
              <View style={styles.communityBadge}>
                <Text style={styles.communityBadgeText} numberOfLines={1}>
                  {(item.emoji || item.name.slice(0, 2)).slice(0, 2)}
                </Text>
              </View>
              <View style={styles.communityTitleGroup}>
                <Text style={styles.communityName}>{item.name}</Text>
                <Text style={styles.communityMeta}>
                  {formatCommunityCadence(item.cadence)} / {formatMemberCount(item.memberCount)}
                </Text>
              </View>
            </View>
            <Text style={styles.communityDescription}>{item.description}</Text>
            <View style={styles.communityFooter}>
              <Text style={styles.communityCategory}>
                {item.category?.name ?? 'General'}
              </Text>
              <Text style={styles.communityRole}>
                {item.currentUserRole ? 'Joined' : 'Open'}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function formatMemberCount(count: number) {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
  },
  copy: {
    gap: 10,
    marginBottom: 6,
  },
  communityCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  communityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  communityBadge: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  communityBadgeText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  communityTitleGroup: {
    flex: 1,
    gap: 3,
  },
  communityName: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '800',
  },
  communityMeta: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  communityDescription: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  communityFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  communityCategory: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  communityRole: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.72,
  },
});
