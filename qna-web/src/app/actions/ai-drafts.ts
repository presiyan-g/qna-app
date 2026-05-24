'use server';

import { getSession } from '@/services/auth';
import { getCommunityBySlug } from '@/services/communities';
import { listRecentQuestionPrompts } from '@/services/questions/dashboard';
import {
  AI_COOLDOWN_MS,
  AI_DAILY_QUOTA,
  getQuotaSnapshot,
  recordUsage,
} from '@/services/ai-usage';
import { generateDraft as defaultGenerateDraft } from '@/lib/ai/question-drafts';

// Next.js 'use server' modules may only export async functions. Types and the
// pure orchestrator are re-exported from ai-drafts.core directly by importers.
import {
  runGenerateQuestionDraft,
  type AIDraftActionState,
} from './ai-drafts.core';

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid env var ${name}: expected an integer, got "${raw}"`);
  }
  return parsed;
}

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite';
const DEFAULT_MAX_OUTPUT_TOKENS = parseEnvInt('AI_MAX_OUTPUT_TOKENS', 800);
const DEFAULT_TIMEOUT_MS = parseEnvInt('AI_REQUEST_TIMEOUT_MS', 20000);

export async function generateQuestionDraftAction(
  slug: string,
  rawInput: { topic: string; useWebSearch: boolean },
): Promise<AIDraftActionState> {
  return runGenerateQuestionDraft(
    {
      getSession,
      getCommunity: async (slugArg, userId) => {
        const c = await getCommunityBySlug(slugArg, userId);
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          description: c.description ?? '',
          currentUserRole: c.currentUserRole,
        };
      },
      getQuotaSnapshot,
      listRecentPrompts: listRecentQuestionPrompts,
      // {} = use the real generateStructured; tests inject their own generate fn via runGenerateQuestionDraft
      generateDraft: (args) => defaultGenerateDraft({}, args),
      recordUsage,
      now: () => new Date(),
      config: {
        model: DEFAULT_MODEL,
        dailyQuota: AI_DAILY_QUOTA,
        cooldownMs: AI_COOLDOWN_MS,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
    },
    slug,
    rawInput,
  );
}
