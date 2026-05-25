import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'seed-data',
);

function readJson(relative) {
  const p = join(SEED_DATA_DIR, relative);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function loadCommunitiesFixture() {
  const data = readJson('communities.json');
  if (!data || !Array.isArray(data)) {
    throw new Error('seed-data/communities.json missing or invalid.');
  }
  return data;
}

export function loadQuestionsFixture(communitySlug) {
  return readJson(join('questions', `${communitySlug}.json`));
}

export function loadBroadcastsFixture(communitySlug) {
  return readJson(join('broadcasts', `${communitySlug}.json`));
}

export function loadCommentsFixture(communitySlug) {
  return readJson(join('comments', `${communitySlug}.json`));
}

export function listCommunitiesWithQuestions() {
  const dir = join(SEED_DATA_DIR, 'questions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
