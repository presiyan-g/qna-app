// One-off generator. NOT run by `npm run seed`. Run manually after you've
// authored or edited communities.json, when you want to regenerate question /
// broadcast / comment fixtures via OpenRouter.
//
// Usage (PowerShell):
//   $env:OPENROUTER_API_KEY="..."; npm run seed:generate
//
// Flags:
//   --only questions          regenerate only questions (skip broadcasts/comments)
//   --only broadcasts
//   --only comments
//   --community <slug>        only generate for one community
//   --skip-if-exists          for questions, skip communities whose JSON already exists

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

// Dynamic-import the TS sources. tsx is the script runner (see package.json's
// `seed:generate` script). That lets these imports resolve .ts files.
const { generateDraft } = await import('../src/lib/ai/question-drafts.ts');
const { generateBroadcastBody } = await import('../src/lib/ai/seed-prompts/broadcasts.ts');
const { generateCommentThread } = await import('../src/lib/ai/seed-prompts/comments.ts');

const SEED_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'seed-data',
);

const args = parseArgs(process.argv.slice(2));

const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite';
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 800);
const TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 20000);
const INTER_REQUEST_DELAY_MS = 250;

const QUESTIONS_PER_COMMUNITY = 20;
const BROADCAST_THEMES = ['welcome', 'weekly_recap', 'resource', 'winner', 'milestone'];
const COMMENT_THREADS_PER_COMMUNITY = 25;

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }
  const communities = JSON.parse(
    readFileSync(join(SEED_DATA_DIR, 'communities.json'), 'utf8'),
  );

  const filtered = args.community
    ? communities.filter((c) => c.slug === args.community)
    : communities;
  if (filtered.length === 0) {
    throw new Error(`No communities matched --community="${args.community}"`);
  }

  for (const community of filtered) {
    console.log(`\n=== ${community.slug} (${community.name}) ===`);
    if (shouldRun('questions')) await generateQuestionsFor(community);
    if (shouldRun('broadcasts')) await generateBroadcastsFor(community);
    if (shouldRun('comments')) await generateCommentsFor(community);
  }
  console.log('\nDone.');
}

function shouldRun(kind) {
  return !args.only || args.only === kind;
}

async function generateQuestionsFor(community) {
  const outPath = join(SEED_DATA_DIR, 'questions', `${community.slug}.json`);
  ensureDirFor(outPath);
  if (args.skipIfExists && existsSync(outPath)) {
    console.log(`questions/${community.slug}.json exists — skipping (remove --skip-if-exists to overwrite).`);
    return;
  }

  const drafts = [];
  const recentPrompts = [];
  for (let i = 0; i < QUESTIONS_PER_COMMUNITY; i++) {
    process.stdout.write(`  question ${i + 1}/${QUESTIONS_PER_COMMUNITY}... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const { draft } = await generateDraft(
          {},
          {
            community: { name: community.name, description: community.description },
            topic: community.description,
            recentPrompts,
            useWebSearch: false,
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        const difficulty = assignDifficulty(i);
        drafts.push({
          prompt: draft.prompt,
          explanation: draft.explanation,
          difficulty,
          choices: draft.choices,
        });
        recentPrompts.push(draft.prompt);
        if (recentPrompts.length > 12) recentPrompts.shift();
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) throw err;
      }
    }
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(drafts, null, 2));
  console.log(`  wrote ${outPath}`);
}

// Indexes 0-6 = easy, 7-13 = medium, 14-19 = hard.
function assignDifficulty(index) {
  if (index < 7) return 'easy';
  if (index < 14) return 'medium';
  return 'hard';
}

async function generateBroadcastsFor(community) {
  const outPath = join(SEED_DATA_DIR, 'broadcasts', `${community.slug}.json`);
  ensureDirFor(outPath);
  if (args.skipIfExists && existsSync(outPath)) {
    console.log(`broadcasts/${community.slug}.json exists — skipping (remove --skip-if-exists to overwrite).`);
    return;
  }
  const broadcasts = [];
  for (const theme of BROADCAST_THEMES) {
    process.stdout.write(`  broadcast ${theme}... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const body = await generateBroadcastBody(
          {},
          {
            community: { name: community.name, description: community.description },
            theme,
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        broadcasts.push({ theme, body });
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) throw err;
      }
    }
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(broadcasts, null, 2));
  console.log(`  wrote ${outPath}`);
}

async function generateCommentsFor(community) {
  const questionsPath = join(SEED_DATA_DIR, 'questions', `${community.slug}.json`);
  if (!existsSync(questionsPath)) {
    console.log('  no questions file — skipping comments. Run --only questions first.');
    return;
  }
  const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));
  const outPath = join(SEED_DATA_DIR, 'comments', `${community.slug}.json`);
  ensureDirFor(outPath);
  if (args.skipIfExists && existsSync(outPath)) {
    console.log(`comments/${community.slug}.json exists — skipping (remove --skip-if-exists to overwrite).`);
    return;
  }

  const threads = [];
  const skippedThreads = [];
  const targetTotal = COMMENT_THREADS_PER_COMMUNITY;
  let remaining = targetTotal;
  const eligibleIndexes = [];
  for (let i = 0; i < 18 && i < questions.length; i++) eligibleIndexes.push(i);
  let cursor = 0;
  while (remaining > 0 && eligibleIndexes.length > 0) {
    const questionIndex = eligibleIndexes[cursor % eligibleIndexes.length];
    const q = questions[questionIndex];
    process.stdout.write(`  comment thread ${threads.length + 1}/${targetTotal} (q${questionIndex})... `);
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const thread = await generateCommentThread(
          {},
          {
            community: { name: community.name, description: community.description },
            question: { prompt: q.prompt, explanation: q.explanation },
            model: MODEL,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            timeoutMs: TIMEOUT_MS,
          },
        );
        threads.push({ questionIndex, ...thread });
        console.log('ok');
        break;
      } catch (err) {
        console.log(`fail (attempt ${attempt}): ${err.message}`);
        if (attempt >= 3) {
          // Soft-fail: log the bad thread, keep going. The seed/comments.mjs
          // loader gracefully handles partial fixtures, and the community will
          // just end up with fewer than 25 comment threads. Better than killing
          // the whole multi-community run for one stubborn question.
          skippedThreads.push({ questionIndex, threadIndex: threads.length, reason: err.message });
        }
      }
    }
    remaining--;
    cursor++;
    await sleep(INTER_REQUEST_DELAY_MS);
  }
  writeFileSync(outPath, JSON.stringify(threads, null, 2));
  if (skippedThreads.length > 0) {
    console.log(
      `  ⚠ skipped ${skippedThreads.length} thread(s) after 3 retries: ${skippedThreads
        .map((s) => `q${s.questionIndex}`)
        .join(', ')}`,
    );
  }
  console.log(`  wrote ${outPath} (${threads.length} threads)`);
}

function ensureDirFor(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseArgs(argv) {
  const out = { only: null, community: null, skipIfExists: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') out.only = argv[++i];
    else if (argv[i] === '--community') out.community = argv[++i];
    else if (argv[i] === '--skip-if-exists') out.skipIfExists = true;
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
