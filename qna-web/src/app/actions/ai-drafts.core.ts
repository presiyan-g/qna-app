// Pure orchestrator — zero module-level side effects.
// No DB imports, no Next.js imports, no `server-only`.
// The ai-drafts.ts file wraps this with real deps and 'use server'.
// Tests import directly from this file.

import { computeCooldownRetryAfter } from '@/services/ai-usage/helpers';
import {
  SafetyBlockedError,
  TimeoutError,
  InvalidJsonError,
  RateLimitError,
  UpstreamError,
} from '@/lib/ai/provider';
import type { Draft } from '@/lib/ai/question-drafts';

const TOPIC_MAX = 500;
const RECENT_PROMPTS_LIMIT = 20;

export type AIDraftErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'validation_failed'
  | 'quota_exhausted'
  | 'cooldown_active'
  | 'safety_blocked'
  | 'provider_timeout'
  | 'provider_error'
  | 'invalid_response';

export type AIDraftActionState =
  | { ok: true; draft: Draft; remainingQuota: number }
  | { ok: false; code: AIDraftErrorCode; retryAfterMs?: number };

export type AIDraftDeps = {
  getSession: () => Promise<{ sub: string } | null>;
  getCommunity: (slug: string, userId: string) => Promise<{
    id: string;
    name: string;
    description: string;
    currentUserRole: 'creator' | 'member' | null;
  } | null>;
  getQuotaSnapshot: (
    userId: string,
    now: Date,
  ) => Promise<{ remaining: number; lastQuotaCountedAt: Date | null }>;
  listRecentPrompts: (communityId: string, limit: number) => Promise<string[]>;
  generateDraft: (args: {
    community: { name: string; description: string };
    topic: string;
    recentPrompts: string[];
    useWebSearch: boolean;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
  }) => Promise<{ draft: Draft; inputTokens: number; outputTokens: number }>;
  recordUsage: (row: {
    userId: string;
    model: string;
    webSearch: boolean;
    inputTokens: number | null;
    outputTokens: number | null;
    success: boolean;
    errorCode: string | null;
  }) => Promise<void>;
  now: () => Date;
  config: {
    model: string;
    dailyQuota: number;
    cooldownMs: number;
    maxOutputTokens: number;
    timeoutMs: number;
  };
};

export type AIDraftInput = {
  topic: string;
  useWebSearch: boolean;
};

function mapProviderError(err: unknown): AIDraftErrorCode {
  if (err instanceof SafetyBlockedError) return 'safety_blocked';
  if (err instanceof TimeoutError) return 'provider_timeout';
  if (err instanceof InvalidJsonError) return 'invalid_response';
  if (err instanceof RateLimitError) return 'provider_error';
  if (err instanceof UpstreamError) return 'provider_error';
  return 'provider_error';
}

export async function runGenerateQuestionDraft(
  deps: AIDraftDeps,
  slug: string,
  input: AIDraftInput,
): Promise<AIDraftActionState> {
  const session = await deps.getSession();
  if (!session) return { ok: false, code: 'unauthenticated' };

  const community = await deps.getCommunity(slug, session.sub);
  if (!community || community.currentUserRole !== 'creator') {
    return { ok: false, code: 'forbidden' };
  }

  const topic = (input.topic ?? '').trim();
  if (topic.length > TOPIC_MAX) {
    return { ok: false, code: 'validation_failed' };
  }
  const useWebSearch = Boolean(input.useWebSearch);

  const now = deps.now();
  const snapshot = await deps.getQuotaSnapshot(session.sub, now);
  if (snapshot.remaining <= 0) {
    return { ok: false, code: 'quota_exhausted' };
  }

  const retryAfterMs = computeCooldownRetryAfter(
    snapshot.lastQuotaCountedAt,
    deps.config.cooldownMs,
    now,
  );
  if (retryAfterMs > 0) {
    return { ok: false, code: 'cooldown_active', retryAfterMs };
  }

  const recentPrompts = await deps.listRecentPrompts(
    community.id,
    RECENT_PROMPTS_LIMIT,
  );

  let draftResult: { draft: Draft; inputTokens: number; outputTokens: number };
  try {
    draftResult = await deps.generateDraft({
      community: { name: community.name, description: community.description },
      topic,
      recentPrompts,
      useWebSearch,
      model: deps.config.model,
      maxOutputTokens: deps.config.maxOutputTokens,
      timeoutMs: deps.config.timeoutMs,
    });
  } catch (err) {
    const code = mapProviderError(err);
    try {
      await deps.recordUsage({
        userId: session.sub,
        model: deps.config.model,
        webSearch: useWebSearch,
        inputTokens: null,
        outputTokens: null,
        success: false,
        errorCode: code,
      });
    } catch (recordErr) {
      console.error('ai-drafts: recordUsage(failure) failed', recordErr);
    }
    return { ok: false, code };
  }

  try {
    await deps.recordUsage({
      userId: session.sub,
      model: deps.config.model,
      webSearch: useWebSearch,
      inputTokens: draftResult.inputTokens,
      outputTokens: draftResult.outputTokens,
      success: true,
      errorCode: null,
    });
  } catch (recordErr) {
    // Don't fail the request if the audit-log write fails — the user already got
    // a valid draft and the quota log can be reconciled out-of-band.
    console.error('ai-drafts: recordUsage(success) failed', recordErr);
  }

  return {
    ok: true,
    draft: draftResult.draft,
    remainingQuota: Math.max(0, snapshot.remaining - 1),
  };
}
