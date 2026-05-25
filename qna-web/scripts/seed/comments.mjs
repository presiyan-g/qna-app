import { eq } from 'drizzle-orm';
import { answers, comments } from './schema.mjs';
import { commentId } from './ids.mjs';
import { loadCommentsFixture } from './fixtures.mjs';
import { makeRng, pickRandom } from './rng.mjs';

export async function seedComments(db, ctx) {
  const { communitiesBySlug, questionsByCommunitySlug } = ctx;
  let total = 0;
  const skippedSlugs = [];

  for (const [slug] of communitiesBySlug.entries()) {
    const fixture = loadCommentsFixture(slug);
    if (!fixture) {
      skippedSlugs.push(slug);
      continue;
    }
    const questionFixture = questionsByCommunitySlug.get(slug);
    if (!questionFixture) continue;

    for (let threadIndex = 0; threadIndex < fixture.length; threadIndex++) {
      const thread = fixture[threadIndex];
      const q = questionFixture[thread.questionIndex];
      if (!q || q.timeline.kind !== 'closed') continue;

      // Pull recent answerers for this question (deterministic order via user_id).
      // This enforces the product rule: comment authors must have answered.
      const answerers = await db
        .select({ userId: answers.userId })
        .from(answers)
        .where(eq(answers.questionId, q.id))
        .orderBy(answers.userId)
        .limit(50);

      if (answerers.length === 0) continue;

      const rng = makeRng('comment', slug, thread.questionIndex, threadIndex);
      const topLevelAuthor = pickRandom(rng, answerers).userId;
      const topLevelId = commentId(slug, thread.questionIndex, threadIndex, 'top');

      // createdAt: uniformly inside (publishedAt, closesAt + 7d).
      const windowStart = q.timeline.publishedAt.getTime();
      const windowEnd = q.timeline.closesAt.getTime() + 7 * 86400000;
      const topCreatedAt = new Date(windowStart + rng() * (windowEnd - windowStart));

      await db
        .insert(comments)
        .values({
          id: topLevelId,
          questionId: q.id,
          authorUserId: topLevelAuthor,
          parentCommentId: null,
          body: thread.topLevel.body,
          createdAt: topCreatedAt,
        })
        .onConflictDoUpdate({
          target: comments.id,
          set: { body: thread.topLevel.body, createdAt: topCreatedAt },
        });
      total++;

      if (thread.reply) {
        // Pick a different user.
        const replyCandidates = answerers.filter((a) => a.userId !== topLevelAuthor);
        if (replyCandidates.length === 0) continue;
        const replyAuthor = pickRandom(rng, replyCandidates).userId;
        const replyCommentId = commentId(slug, thread.questionIndex, threadIndex, 'reply');
        const replyCreatedAt = new Date(
          topCreatedAt.getTime() + Math.floor(rng() * 48 * 3600000),
        );

        await db
          .insert(comments)
          .values({
            id: replyCommentId,
            questionId: q.id,
            authorUserId: replyAuthor,
            parentCommentId: topLevelId,
            body: thread.reply.body,
            createdAt: replyCreatedAt,
          })
          .onConflictDoUpdate({
            target: comments.id,
            set: { body: thread.reply.body, createdAt: replyCreatedAt },
          });
        total++;
      }
    }
  }

  if (skippedSlugs.length > 0) {
    console.warn(
      `  ⚠ No comments fixture for: ${skippedSlugs.join(', ')}. ` +
        `Run \`npm run seed:generate -- --only comments\` first.`,
    );
  }
  console.log(`Seeded ${total} comments.`);
  return {};
}
