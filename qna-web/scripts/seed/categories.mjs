import { inArray } from 'drizzle-orm';
import { communityCategories } from './schema.mjs';
import { categoryIdBySlug } from './ids.mjs';

// Same 18 categories as the old top-level seed-categories.mjs.
export const categories = [
  {
    slug: 'ai-and-tools',
    name: 'AI & Tools',
    description: 'Applied AI, agents, workflows, and builders shipping useful systems.',
  },
  {
    slug: 'programming-and-software',
    name: 'Programming & Software',
    description: 'Software engineering, languages, systems design, and craft questions.',
  },
  {
    slug: 'web-and-design',
    name: 'Web & Design',
    description: 'Modern front-end craft, interface design, CSS, and product polish.',
  },
  {
    slug: 'security-and-ops',
    name: 'Security & Ops',
    description: 'Security review, incident response, infrastructure, and reliability.',
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    description: 'Video games, board games, chess, mechanics, and player culture.',
  },
  {
    slug: 'fun-facts',
    name: 'Fun Facts',
    description: 'Bite-sized trivia, curious phenomena, and "did you know" surprises.',
  },
  {
    slug: 'geography',
    name: 'Geography',
    description: 'Places, maps, borders, cities, landscapes, and how the world is laid out.',
  },
  {
    slug: 'history',
    name: 'History',
    description: 'Events, eras, people, and turning points across world and regional history.',
  },
  {
    slug: 'science-and-health',
    name: 'Science & Health',
    description: 'Biotech, neuroscience, research literacy, and clinical reasoning.',
  },
  {
    slug: 'math-and-logic',
    name: 'Math & Logic',
    description: 'Puzzles, proofs, probability, and clean reasoning under uncertainty.',
  },
  {
    slug: 'markets-and-policy',
    name: 'Markets & Policy',
    description: 'Macro signals, business cycles, finance, and public policy questions.',
  },
  {
    slug: 'product-and-startups',
    name: 'Product & Startups',
    description: 'Founder habits, product sense, growth, and community building.',
  },
  {
    slug: 'writing-and-culture',
    name: 'Writing & Culture',
    description: 'Writing practice, film, philosophy, and cultural critique.',
  },
  {
    slug: 'languages',
    name: 'Languages',
    description: 'Grammar, vocabulary, usage, and learning across world languages.',
  },
  {
    slug: 'food-and-cooking',
    name: 'Food & Cooking',
    description: 'Technique, ingredients, cuisines, and the science behind good cooking.',
  },
  {
    slug: 'music',
    name: 'Music',
    description: 'Theory, production, instruments, genres, and listening practice.',
  },
  {
    slug: 'sports-and-fitness',
    name: 'Sports & Fitness',
    description: 'Training, performance, tactics, and the sports worth following.',
  },
  {
    slug: 'law-and-civics',
    name: 'Law & Civics',
    description: 'Contracts, governance, civic systems, and practical legal concepts.',
  },
];

export const deprecatedCategorySlugs = ['strategy-games'];

export async function seedCategories(db) {
  const rows = await Promise.all(
    categories.map((category) =>
      db
        .insert(communityCategories)
        .values({
          id: categoryIdBySlug(category.slug),
          slug: category.slug,
          name: category.name,
          description: category.description,
        })
        .onConflictDoUpdate({
          target: communityCategories.slug,
          set: { name: category.name, description: category.description },
        })
        .returning(),
    ),
  );

  if (deprecatedCategorySlugs.length > 0) {
    await db
      .delete(communityCategories)
      .where(inArray(communityCategories.slug, deprecatedCategorySlugs));
  }

  const categoryBySlug = new Map(rows.map(([cat]) => [cat.slug, cat]));
  console.log(`Seeded ${categoryBySlug.size} categories.`);
  return { categoryBySlug };
}
