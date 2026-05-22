import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { inArray, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { seedCategories } from './seed-categories.mjs';

config({ path: '.env.local' });
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.');
}

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

const communities = pgTable(
  'communities',
  {
    id: uuid('id').primaryKey(),
    creatorUserId: uuid('creator_user_id').notNull(),
    categoryId: uuid('category_id'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    emoji: text('emoji').notNull(),
    cadence: text('cadence').notNull(),
    status: text('status').notNull(),
    isFeatured: boolean('is_featured').notNull(),
    featuredRank: integer('featured_rank'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('communities_slug_unique').on(table.slug)],
);

const communityMembers = pgTable(
  'community_members',
  {
    id: uuid('id').primaryKey(),
    communityId: uuid('community_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('community_members_community_user_unique').on(
      table.communityId,
      table.userId,
    ),
  ],
);

const db = drizzle(neon(process.env.DATABASE_URL));

const PASSWORD_HASH =
  '$2b$10$H0qbDEKzV5l7j7JMrNlxLOiFKZLeHtYRqH61pUQ3DP9Ls15lBpF8K';

const seededCommunities = [
  {
    slug: 'daily-ai-builders',
    name: 'Daily AI Builders',
    emoji: '🤖',
    categorySlug: 'ai-and-tools',
    description: 'One applied AI architecture question a day for people building useful agents, automations, and tools.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 1,
    targetMembers: 420,
  },
  {
    slug: 'chess-tactics-daily',
    name: 'Chess Tactics Daily',
    emoji: '♟',
    categorySlug: 'gaming',
    description: 'A tactical chess position every day, with discussion unlocked after you choose your line.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 2,
    targetMembers: 360,
  },
  {
    slug: 'modern-css-daily',
    name: 'Modern CSS Daily',
    emoji: '🎨',
    categorySlug: 'web-and-design',
    description: 'Tiny daily prompts on layout, selectors, accessibility, and the modern CSS features worth knowing.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 3,
    targetMembers: 315,
  },
  {
    slug: 'macro-and-markets',
    name: 'Macro & Markets',
    emoji: '📈',
    categorySlug: 'markets-and-policy',
    description: 'Daily questions about rates, inflation, business cycles, and the signals behind market narratives.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 4,
    targetMembers: 480,
  },
  {
    slug: 'biotech-reading-club',
    name: 'Biotech Reading Club',
    emoji: '🧬',
    categorySlug: 'science-and-health',
    description: 'Practice reading trials, abstracts, endpoints, and biotech claims without getting lost in jargon.',
    cadence: 'weekly',
    isFeatured: true,
    featuredRank: 5,
    targetMembers: 240,
  },
  {
    slug: 'contracts-and-clauses',
    name: 'Contracts & Clauses',
    emoji: '⚖️',
    categorySlug: 'law-and-civics',
    description: 'A practical contract clause, doctrine, or drafting decision to unpack each weekday.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 6,
    targetMembers: 285,
  },
  {
    slug: 'product-sense-gym',
    name: 'Product Sense Gym',
    emoji: '🧭',
    categorySlug: 'product-and-startups',
    description: 'Short product judgment reps: tradeoffs, prioritization, onboarding, pricing, and launch choices.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 7,
    targetMembers: 330,
  },
  {
    slug: 'security-review-club',
    name: 'Security Review Club',
    emoji: '🔐',
    categorySlug: 'security-and-ops',
    description: 'Daily security review scenarios for app builders who want sharper threat-modeling instincts.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 8,
    targetMembers: 300,
  },
  {
    slug: 'data-viz-daily',
    name: 'Data Viz Daily',
    emoji: '📊',
    categorySlug: 'web-and-design',
    description: 'One chart critique or visualization decision a day for clearer analytical storytelling.',
    cadence: 'daily',
    isFeatured: true,
    featuredRank: 9,
    targetMembers: 210,
  },
  {
    slug: 'founder-onboarding-lab',
    name: 'Founder Onboarding Lab',
    emoji: '🚀',
    categorySlug: 'product-and-startups',
    description: 'Improve activation, retention, and first-run product moments through focused daily cases.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 195,
  },
  {
    slug: 'writing-workshop-daily',
    name: 'Writing Workshop Daily',
    emoji: '✍️',
    categorySlug: 'writing-and-culture',
    description: 'A daily sentence, structure, or editing challenge for writers who want sharper drafts.',
    cadence: 'daily',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 265,
  },
  {
    slug: 'neuroscience-notebook',
    name: 'Neuroscience Notebook',
    emoji: '🧠',
    categorySlug: 'science-and-health',
    description: 'Memory, attention, behavior, and brain science questions grounded in readable research.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 180,
  },
  {
    slug: 'indie-game-design',
    name: 'Indie Game Design',
    emoji: '🎮',
    categorySlug: 'gaming',
    description: 'Small daily prompts about mechanics, pacing, level design, and player motivation.',
    cadence: 'daily',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 220,
  },
  {
    slug: 'spanish-grammar-daily',
    name: 'Spanish Grammar Daily',
    emoji: '🇪🇸',
    categorySlug: 'languages',
    description: 'One practical Spanish grammar or usage question a day with a concise explanation.',
    cadence: 'daily',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 275,
  },
  {
    slug: 'urbanist-field-notes',
    name: 'Urbanist Field Notes',
    emoji: '🏙️',
    categorySlug: 'markets-and-policy',
    description: 'Transit, housing, zoning, street design, and public-space tradeoffs in daily miniature.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 160,
  },
  {
    slug: 'film-scene-study',
    name: 'Film Scene Study',
    emoji: '🎬',
    categorySlug: 'writing-and-culture',
    description: 'Break down one shot, edit, line, or scene choice at a time.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 145,
  },
  {
    slug: 'no-code-automation',
    name: 'No-Code Automation',
    emoji: '🛠️',
    categorySlug: 'ai-and-tools',
    description: 'Daily workflow puzzles for people building useful automations without a full engineering team.',
    cadence: 'daily',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 235,
  },
  {
    slug: 'devops-incident-room',
    name: 'DevOps Incident Room',
    emoji: '🚨',
    categorySlug: 'security-and-ops',
    description: 'Reliability scenarios, alert triage, postmortem judgment, and operational tradeoffs.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 205,
  },
  {
    slug: 'philosophy-questions',
    name: 'Philosophy Questions',
    emoji: '🪞',
    categorySlug: 'writing-and-culture',
    description: 'Accessible thought experiments and arguments for people who like clean thinking.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 170,
  },
  {
    slug: 'climate-systems-lab',
    name: 'Climate Systems Lab',
    emoji: '🌦️',
    categorySlug: 'science-and-health',
    description: 'Climate, energy, and systems questions that reward careful reasoning over hot takes.',
    cadence: 'weekly',
    isFeatured: false,
    featuredRank: null,
    targetMembers: 190,
  },
];

const maxDemoMembers = Math.max(
  ...seededCommunities.map((community) => community.targetMembers - 1),
);

const seedOwnerEmail = 'quorum-seed@local.test';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo communities in production.');
  }

  const [seedOwner] = await db
    .insert(users)
    .values({
      email: seedOwnerEmail,
      username: 'quorum_seed',
      passwordHash: PASSWORD_HASH,
      role: 'admin',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        username: 'quorum_seed',
        role: 'admin',
      },
    })
    .returning();

  const categoryBySlug = await seedCategories(db);

  const demoUsers = Array.from({ length: maxDemoMembers }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    return {
      email: `demo-member-${number}@local.test`,
      username: `demo_member_${number}`,
      passwordHash: PASSWORD_HASH,
      role: 'member',
    };
  });

  for (const chunk of chunkArray(demoUsers, 100)) {
    await db.insert(users).values(chunk).onConflictDoNothing();
  }

  const allDemoUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.username, 'demo_member_%'));

  allDemoUsers.sort((a, b) => a.username.localeCompare(b.username));

  for (const seedCommunity of seededCommunities) {
    const category = categoryBySlug.get(seedCommunity.categorySlug);
    if (!category) {
      throw new Error(`Missing category ${seedCommunity.categorySlug}.`);
    }

    const [community] = await db
      .insert(communities)
      .values({
        creatorUserId: seedOwner.id,
        categoryId: category.id,
        slug: seedCommunity.slug,
        name: seedCommunity.name,
        description: seedCommunity.description,
        emoji: seedCommunity.emoji,
        cadence: seedCommunity.cadence,
        status: 'active',
        isFeatured: seedCommunity.isFeatured,
        featuredRank: seedCommunity.featuredRank,
      })
      .onConflictDoUpdate({
        target: communities.slug,
        set: {
          creatorUserId: seedOwner.id,
          categoryId: category.id,
          name: seedCommunity.name,
          description: seedCommunity.description,
          emoji: seedCommunity.emoji,
          cadence: seedCommunity.cadence,
          status: 'active',
          isFeatured: seedCommunity.isFeatured,
          featuredRank: seedCommunity.featuredRank,
        },
      })
      .returning();

    await db
      .insert(communityMembers)
      .values({
        communityId: community.id,
        userId: seedOwner.id,
        role: 'creator',
      })
      .onConflictDoNothing();

    const memberRows = allDemoUsers
      .slice(0, seedCommunity.targetMembers - 1)
      .map((user) => ({
        communityId: community.id,
        userId: user.id,
        role: 'member',
      }));

    for (const chunk of chunkArray(memberRows, 250)) {
      await db.insert(communityMembers).values(chunk).onConflictDoNothing();
    }
  }

  const seededSlugs = seededCommunities.map((community) => community.slug);
  const seededRows = await db
    .select({
      slug: communities.slug,
      isFeatured: communities.isFeatured,
      featuredRank: communities.featuredRank,
    })
    .from(communities)
    .where(inArray(communities.slug, seededSlugs));

  const featuredCount = seededRows.filter((row) => row.isFeatured).length;
  console.log(
    `Seeded ${categoryBySlug.size} categories, ${seededRows.length} communities, and ${featuredCount} featured communities.`,
  );
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
