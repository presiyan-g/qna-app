import { v5 as uuidv5 } from 'uuid';

// Generated once via `node -e "console.log(require('uuid').v4())"` on 2026-05-24.
// Do NOT change — all deterministic seed IDs derive from this namespace.
// Changing it would orphan every previously-seeded row.
const SEED_NAMESPACE = 'b3e91d2a-7c84-4f51-9d02-1a6f4e8c5b73';

const id = (key) => uuidv5(key, SEED_NAMESPACE);

export const userIdByUsername = (username) => id(`user:${username}`);
export const categoryIdBySlug = (slug) => id(`category:${slug}`);
export const communityIdBySlug = (slug) => id(`community:${slug}`);
export const membershipId = (communitySlug, username) =>
  id(`membership:${communitySlug}:${username}`);
export const questionId = (communitySlug, index) =>
  id(`question:${communitySlug}:${index}`);
export const choiceId = (communitySlug, questionIndex, position) =>
  id(`choice:${communitySlug}:${questionIndex}:${position}`);
export const answerId = (communitySlug, questionIndex, username) =>
  id(`answer:${communitySlug}:${questionIndex}:${username}`);
export const broadcastId = (communitySlug, index) =>
  id(`broadcast:${communitySlug}:${index}`);
export const commentId = (communitySlug, questionIndex, threadIndex, kind) =>
  id(`comment:${communitySlug}:${questionIndex}:${threadIndex}:${kind}`);
