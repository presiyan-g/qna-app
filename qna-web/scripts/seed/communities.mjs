import { communities, communityMembers } from './schema.mjs';
import { communityIdBySlug, membershipId } from './ids.mjs';
import { makeRng, sampleSubset } from './rng.mjs';
import { chunkArray } from './util.mjs';
import { loadCommunitiesFixture } from './fixtures.mjs';

const MIN_PER_USER = 2;
const MAX_PER_USER = 5;

export async function seedCommunities(db, ctx) {
  const { seedOwner, testAccountsByUsername, demoUsers, categoryBySlug } = ctx;

  const fixture = loadCommunitiesFixture();
  const upserted = [];
  for (const community of fixture) {
    const category = categoryBySlug.get(community.categorySlug);
    if (!category) {
      throw new Error(`Unknown categorySlug: ${community.categorySlug}`);
    }

    const creatorUserId = resolveCreatorUserId(community, ctx);

    // We seed the row with our deterministic UUID v5 so fresh DBs get stable IDs.
    // On conflict (slug already exists, e.g. from the old seed which used random
    // UUIDs), we update the non-id fields and use `.returning()` to capture the
    // actual id Postgres kept. That actual id is what downstream modules
    // (questions, broadcasts, memberships) must reference — not the deterministic
    // one — or every downstream insert hits a foreign-key violation.
    const [row] = await db
      .insert(communities)
      .values({
        id: communityIdBySlug(community.slug),
        creatorUserId,
        categoryId: category.id,
        slug: community.slug,
        name: community.name,
        description: community.description,
        emoji: community.emoji,
        cadence: community.cadence,
        status: 'active',
        isFeatured: community.isFeatured,
        featuredRank: community.featuredRank,
        directoryRank: community.directoryRank ?? null,
      })
      .onConflictDoUpdate({
        target: communities.slug,
        set: {
          creatorUserId,
          categoryId: category.id,
          name: community.name,
          description: community.description,
          emoji: community.emoji,
          cadence: community.cadence,
          status: 'active',
          isFeatured: community.isFeatured,
          featuredRank: community.featuredRank,
          directoryRank: community.directoryRank ?? null,
        },
      })
      .returning({ id: communities.id, slug: communities.slug });

    upserted.push({ ...community, id: row.id, creatorUserId });
  }

  // Map slug -> actual DB community id, for the membership cross-pollination
  // below. Using `upserted` (which now holds real DB ids) ensures memberships
  // point at the row that actually exists, not at the deterministic id which
  // may differ from the DB's id when the slug pre-existed.
  const actualIdBySlug = new Map(upserted.map((c) => [c.slug, c.id]));

  // Membership cross-pollination — each demo user joins 2–5 communities (deterministic).
  const memberships = []; // { communityId, userId, role }

  // Owners are always members of their own community as creator.
  for (const community of upserted) {
    memberships.push({
      communityId: community.id,
      userId: community.creatorUserId,
      role: 'creator',
    });
  }

  // Each demo user picks 2–5 communities deterministically.
  const allSlugs = upserted.map((c) => c.slug);
  for (const user of demoUsers) {
    const rng = makeRng('membership', user.username);
    const pickCount = MIN_PER_USER + Math.floor(rng() * (MAX_PER_USER - MIN_PER_USER + 1));
    const chosenSlugs = sampleSubset(rng, allSlugs, pickCount);
    for (const slug of chosenSlugs) {
      memberships.push({
        communityId: actualIdBySlug.get(slug),
        userId: user.id,
        role: 'member',
      });
    }
  }

  // The named test accounts get a richer set of memberships so their profiles look populated.
  const demoMember = testAccountsByUsername.get('demo_member');
  if (demoMember) {
    const rng = makeRng('membership', 'demo_member');
    const chosenSlugs = sampleSubset(rng, allSlugs, 6);
    for (const slug of chosenSlugs) {
      memberships.push({ communityId: actualIdBySlug.get(slug), userId: demoMember.id, role: 'member' });
    }
  }
  const demoCreator = testAccountsByUsername.get('demo_creator');
  if (demoCreator) {
    const rng = makeRng('membership', 'demo_creator');
    const chosenSlugs = sampleSubset(rng, allSlugs, 3);
    for (const slug of chosenSlugs) {
      memberships.push({ communityId: actualIdBySlug.get(slug), userId: demoCreator.id, role: 'member' });
    }
  }

  // Build reverse map for membership ID derivation (uses username).
  const usernameByUserId = new Map();
  for (const u of demoUsers) usernameByUserId.set(u.id, u.username);
  if (seedOwner) usernameByUserId.set(seedOwner.id, seedOwner.username);
  for (const [username, u] of testAccountsByUsername.entries()) usernameByUserId.set(u.id, username);

  // Build lookup maps once.
  const slugByCommunityId = new Map(upserted.map((c) => [c.id, c.slug]));
  const communityByCommunityId = new Map(upserted.map((c) => [c.id, c]));

  // Dedupe by (communityId, userId).
  const seen = new Set();
  const deduped = [];
  for (const m of memberships) {
    const key = `${m.communityId}:${m.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }

  for (const chunk of chunkArray(deduped, 500)) {
    await db
      .insert(communityMembers)
      .values(
        chunk.map((m) => {
          const username = usernameByUserId.get(m.userId);
          const slug = slugByCommunityId.get(m.communityId);
          if (!slug || !username) {
            throw new Error(
              `Cannot build membership ID: missing slug or username (userId=${m.userId}, communityId=${m.communityId})`,
            );
          }
          return {
            id: membershipId(slug, username),
            communityId: m.communityId,
            userId: m.userId,
            role: m.role,
          };
        }),
      )
      .onConflictDoNothing();
  }

  // Build the membership-by-community map for downstream modules.
  const membershipsByCommunitySlug = new Map();
  for (const community of upserted) {
    membershipsByCommunitySlug.set(community.slug, []);
  }
  for (const m of deduped) {
    const community = communityByCommunityId.get(m.communityId);
    if (!community) continue;
    membershipsByCommunitySlug.get(community.slug).push({
      userId: m.userId,
      role: m.role,
    });
  }

  console.log(`Seeded ${upserted.length} communities, ${deduped.length} memberships.`);
  return {
    communitiesBySlug: new Map(upserted.map((c) => [c.slug, c])),
    membershipsByCommunitySlug,
  };
}

function resolveCreatorUserId(community, ctx) {
  if (!community.creatorUsername) return ctx.seedOwner.id;
  const testAcc = ctx.testAccountsByUsername.get(community.creatorUsername);
  if (testAcc) return testAcc.id;
  const pooled = ctx.demoUsers.find((u) => u.username === community.creatorUsername);
  if (pooled) return pooled.id;
  throw new Error(
    `creatorUsername "${community.creatorUsername}" for community "${community.slug}" not found.`,
  );
}
