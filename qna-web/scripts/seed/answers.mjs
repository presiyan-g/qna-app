import { answers } from './schema.mjs';
import { answerId } from './ids.mjs';
import {
  shouldAnswer,
  pickCorrectness,
  pickIsLate,
  pickAnsweredAt,
  pickWrongChoicePosition,
} from './timeline.mjs';
import { chunkArray } from './util.mjs';

const CHUNK_SIZE = 1000;
const QUESTION_POINTS = 10;

export async function seedAnswers(db, ctx) {
  const {
    communitiesBySlug,
    membershipsByCommunitySlug,
    questionsByCommunitySlug,
    testAccountsByUsername,
    demoUsers,
    seedOwner,
  } = ctx;

  // Reverse lookup: userId → username (needed to key the deterministic RNG).
  const usernameByUserId = new Map();
  for (const u of demoUsers) usernameByUserId.set(u.id, u.username);
  for (const [username, u] of testAccountsByUsername.entries()) usernameByUserId.set(u.id, username);
  if (seedOwner) usernameByUserId.set(seedOwner.id, seedOwner.username);

  const allRows = [];
  let totalSkipped = 0;

  for (const [slug] of communitiesBySlug.entries()) {
    const fixture = questionsByCommunitySlug.get(slug);
    if (!fixture) continue;
    const members = (membershipsByCommunitySlug.get(slug) ?? []).slice();
    if (members.length === 0) continue;

    // Force-include demo_member so their profile is populated even if they
    // wouldn't normally land in this community's membership.
    const demoMember = testAccountsByUsername.get('demo_member');
    if (demoMember) {
      const alreadyMember = members.some((m) => m.userId === demoMember.id);
      if (!alreadyMember) {
        members.push({ userId: demoMember.id, role: 'member' });
      }
    }

    for (const q of fixture) {
      if (q.timeline.kind !== 'closed') continue; // open + scheduled have no answers
      const { publishedAt, closesAt } = q.timeline;
      const correct = q.correctChoice;
      if (!correct) {
        // Defensive: a fixture without a correct choice shouldn't seed answers.
        totalSkipped++;
        continue;
      }

      for (const m of members) {
        const username = usernameByUserId.get(m.userId);
        if (!username) continue; // skip if we can't key the RNG (shouldn't happen)

        if (!shouldAnswer({ username, communitySlug: slug, questionIndex: q.index })) continue;

        const isCorrect = pickCorrectness(username, slug, q.index, q.difficulty);
        const isLate = pickIsLate({ username, communitySlug: slug, questionIndex: q.index });

        const selectedChoiceId = isCorrect
          ? correct.id
          : q.choices[
              pickWrongChoicePosition({
                username,
                communitySlug: slug,
                questionIndex: q.index,
                correctPosition: correct.position,
              })
            ].id;

        const answeredAt = pickAnsweredAt({
          username,
          communitySlug: slug,
          questionIndex: q.index,
          publishedAt,
          closesAt,
          isLate,
        });

        const pointsAwarded = !isLate && isCorrect ? QUESTION_POINTS : 0;

        allRows.push({
          id: answerId(slug, q.index, username),
          questionId: q.id,
          userId: m.userId,
          selectedChoiceId,
          isCorrect,
          isLate,
          pointsAwarded,
          answeredAt,
        });
      }
    }
  }

  // The deterministic id() already encodes the (question_id, user_id) uniqueness,
  // so onConflictDoNothing is safe and lets re-runs be idempotent without churn.
  let inserted = 0;
  for (const chunk of chunkArray(allRows, CHUNK_SIZE)) {
    await db.insert(answers).values(chunk).onConflictDoNothing();
    inserted += chunk.length;
    if (inserted % 10000 === 0 || inserted === allRows.length) {
      console.log(`  answers progress: ${inserted}/${allRows.length}`);
    }
  }

  console.log(`Seeded ${allRows.length} answers (skipped ${totalSkipped}).`);
  return { answerCount: allRows.length };
}
