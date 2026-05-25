import { questions, questionChoices } from './schema.mjs';
import { questionId, choiceId } from './ids.mjs';
import { loadQuestionsFixture, listCommunitiesWithQuestions } from './fixtures.mjs';
import { computeQuestionTimeline } from './timeline.mjs';
import { chunkArray } from './util.mjs';

export async function seedQuestions(db, ctx) {
  const { communitiesBySlug } = ctx;
  const now = new Date();

  const expectedSlugs = Array.from(communitiesBySlug.keys());
  const haveQuestionsFor = new Set(listCommunitiesWithQuestions());
  const missing = expectedSlugs.filter((s) => !haveQuestionsFor.has(s));
  if (missing.length > 0) {
    console.warn(
      `  ⚠ No questions fixture for: ${missing.join(', ')}. ` +
        `Run \`npm run seed:generate -- --only questions\` first.`,
    );
  }

  const questionsByCommunitySlug = new Map();
  let totalQuestions = 0;
  let totalChoices = 0;

  for (const [slug, community] of communitiesBySlug.entries()) {
    const fixture = loadQuestionsFixture(slug);
    if (!fixture) continue;

    const questionRows = [];
    const choiceRows = [];
    const fixtureWithIds = [];

    for (let i = 0; i < fixture.length; i++) {
      const q = fixture[i];
      const timeline = computeQuestionTimeline({ now, index: i, cadence: community.cadence });
      const qId = questionId(slug, i);

      questionRows.push({
        id: qId,
        communityId: community.id,
        creatorUserId: community.creatorUserId,
        prompt: q.prompt,
        explanation: q.explanation,
        scheduledFor: timeline.scheduledFor,
        publishedAt: timeline.publishedAt,
        closesAt: timeline.closesAt,
        timeZone: 'GMT',
        points: 10,
      });

      const trackedChoices = [];
      for (let p = 0; p < q.choices.length; p++) {
        const c = q.choices[p];
        const cId = choiceId(slug, i, p);
        choiceRows.push({
          id: cId,
          questionId: qId,
          label: c.label,
          isCorrect: c.isCorrect,
          position: p,
        });
        trackedChoices.push({ id: cId, position: p, isCorrect: c.isCorrect, label: c.label });
      }

      const correct = trackedChoices.find((c) => c.isCorrect);
      fixtureWithIds.push({
        index: i,
        id: qId,
        prompt: q.prompt,
        explanation: q.explanation,
        difficulty: q.difficulty,
        timeline,
        choices: trackedChoices,
        correctChoice: correct,
      });
    }

    // Per-row upsert for questions — drizzle's onConflictDoUpdate `set` applies the
    // same values to every conflicting row, so chunked inserts can't carry per-row
    // fixture edits through. ~400 round-trips total for a full seed; acceptable.
    for (const row of questionRows) {
      await db
        .insert(questions)
        .values(row)
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            prompt: row.prompt,
            explanation: row.explanation,
            scheduledFor: row.scheduledFor,
            publishedAt: row.publishedAt,
            closesAt: row.closesAt,
            creatorUserId: row.creatorUserId,
          },
        });
    }

    // Choices are write-once (fixture edits to choice text are rare; if you make one,
    // delete the affected rows in SQL and reseed). onConflictDoNothing keeps re-runs cheap.
    for (const chunk of chunkArray(choiceRows, 500)) {
      await db
        .insert(questionChoices)
        .values(chunk)
        .onConflictDoNothing();
    }

    questionsByCommunitySlug.set(slug, fixtureWithIds);
    totalQuestions += questionRows.length;
    totalChoices += choiceRows.length;
  }

  console.log(`Seeded ${totalQuestions} questions, ${totalChoices} choices.`);
  return { questionsByCommunitySlug };
}
