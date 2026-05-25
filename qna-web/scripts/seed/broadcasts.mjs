import { broadcastPosts } from './schema.mjs';
import { broadcastId } from './ids.mjs';
import { loadBroadcastsFixture } from './fixtures.mjs';

// Days-ago offsets per theme slot. Spreads the 5 broadcasts across the last 30 days
// so the broadcast feed looks credibly populated.
const THEME_DAYS_AGO = {
  welcome: 28,
  weekly_recap: 21,
  resource: 14,
  winner: 7,
  milestone: 2,
};

export async function seedBroadcasts(db, ctx) {
  const { communitiesBySlug } = ctx;
  const now = new Date();
  let total = 0;
  const skippedSlugs = [];

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = loadBroadcastsFixture(slug);
    if (!fixture) {
      skippedSlugs.push(slug);
      continue;
    }
    for (let i = 0; i < fixture.length; i++) {
      const entry = fixture[i];
      const daysAgo = THEME_DAYS_AGO[entry.theme] ?? 10;
      const publishedAt = new Date(now.getTime() - daysAgo * 86400000);
      await db
        .insert(broadcastPosts)
        .values({
          id: broadcastId(slug, i),
          communityId: community.id,
          authorUserId: community.creatorUserId,
          body: entry.body,
          publishedAt,
        })
        .onConflictDoUpdate({
          target: broadcastPosts.id,
          set: { body: entry.body, publishedAt },
        });
      total++;
    }
  }

  if (skippedSlugs.length > 0) {
    console.warn(
      `  ⚠ No broadcasts fixture for: ${skippedSlugs.join(', ')}. ` +
        `Run \`npm run seed:generate -- --only broadcasts\` first.`,
    );
  }
  console.log(`Seeded ${total} broadcasts.`);
  return {};
}
