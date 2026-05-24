import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  runGenerateQuestionDraft,
  type AIDraftDeps,
} from './ai-drafts.core';
import { SafetyBlockedError, UpstreamError } from '@/lib/ai/provider';

type TestDeps = AIDraftDeps & { __recorded: Record<string, unknown>[] };

const baseDeps = (): TestDeps => {
  const recorded: Record<string, unknown>[] = [];
  return {
    getSession: async () => ({ sub: 'user-1' }),
    getCommunity: async () => ({
      id: 'c-1',
      name: 'Daily AI Builders',
      description: 'About AI.',
      currentUserRole: 'creator',
    }),
    getQuotaSnapshot: async () => ({
      remaining: 20,
      lastQuotaCountedAt: null,
    }),
    listRecentPrompts: async () => ['Old question?'],
    generateDraft: async () => ({
      draft: {
        prompt: 'A new draft question about MCP servers?',
        explanation: 'Because the spec says so. Two sentences here.',
        choices: [
          { label: 'JSON-RPC', isCorrect: true },
          { label: 'gRPC', isCorrect: false },
          { label: 'GraphQL', isCorrect: false },
          { label: 'SOAP', isCorrect: false },
        ],
      },
      inputTokens: 100,
      outputTokens: 200,
    }),
    recordUsage: async (row) => {
      recorded.push(row as unknown as Record<string, unknown>);
    },
    now: () => new Date('2026-05-24T12:00:00.000Z'),
    config: {
      model: 'google/gemini-2.5-flash-lite',
      dailyQuota: 20,
      cooldownMs: 5000,
      maxOutputTokens: 800,
      timeoutMs: 20000,
    },
    __recorded: recorded,
  };
};

describe('runGenerateQuestionDraft', () => {
  it('happy path returns ok with draft + remainingQuota', async () => {
    const deps = baseDeps();
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: 'MCP',
      useWebSearch: false,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.draft.choices.length, 4);
      assert.equal(result.remainingQuota, 19);
    }
    const recorded = deps.__recorded;
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].success, true);
    assert.equal(recorded[0].inputTokens, 100);
    assert.equal(recorded[0].outputTokens, 200);
    assert.equal(recorded[0].errorCode, null);
  });

  it('rejects unauthenticated', async () => {
    const deps = baseDeps();
    deps.getSession = async () => null;
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'unauthenticated');
  });

  it('rejects non-creator members', async () => {
    const deps = baseDeps();
    deps.getCommunity = async () => ({
      id: 'c-1',
      name: 'X',
      description: 'X',
      currentUserRole: 'member',
    });
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'forbidden');
  });

  it('rejects topic longer than 500 chars', async () => {
    const deps = baseDeps();
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: 'a'.repeat(501),
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'validation_failed');
    assert.equal(deps.__recorded.length, 0);
  });

  it('blocks when quota is exhausted', async () => {
    const deps = baseDeps();
    deps.getQuotaSnapshot = async () => ({
      remaining: 0,
      lastQuotaCountedAt: new Date('2026-05-24T11:30:00.000Z'),
    });
    let generateCalls = 0;
    deps.generateDraft = async () => {
      generateCalls++;
      throw new Error('should not be called');
    };
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'quota_exhausted');
    assert.equal(generateCalls, 0);
  });

  it('blocks when inside the cooldown window', async () => {
    const deps = baseDeps();
    deps.getQuotaSnapshot = async () => ({
      remaining: 19,
      lastQuotaCountedAt: new Date('2026-05-24T11:59:59.000Z'),
    });
    let generateCalls = 0;
    deps.generateDraft = async () => {
      generateCalls++;
      throw new Error('should not be called');
    };
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'cooldown_active');
      assert.equal(result.retryAfterMs, 4000);
    }
    assert.equal(generateCalls, 0);
  });

  it('records a safety_blocked failure and surfaces the error', async () => {
    const deps = baseDeps();
    deps.generateDraft = async () => {
      throw new SafetyBlockedError();
    };
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: 'spicy topic',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'safety_blocked');
    const recorded = deps.__recorded;
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].success, false);
    assert.equal(recorded[0].errorCode, 'safety_blocked');
  });

  it('records an UpstreamError as a provider_error row', async () => {
    const deps = baseDeps();
    deps.generateDraft = async () => {
      throw new UpstreamError(503);
    };
    const result = await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'provider_error');
    const recorded = deps.__recorded;
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].success, false);
    assert.equal(recorded[0].errorCode, 'provider_error');
  });

  it('passes useWebSearch=true through to generateDraft', async () => {
    const deps = baseDeps();
    let captured: Parameters<AIDraftDeps['generateDraft']>[0] | null = null;
    deps.generateDraft = async (args) => {
      captured = args;
      return {
        draft: {
          prompt: 'A new draft question about MCP servers?',
          explanation: 'Because the spec says so. Two sentences here.',
          choices: [
            { label: 'A', isCorrect: true },
            { label: 'B', isCorrect: false },
            { label: 'C', isCorrect: false },
            { label: 'D', isCorrect: false },
          ],
        },
        inputTokens: 1,
        outputTokens: 1,
      };
    };
    await runGenerateQuestionDraft(deps, 'slug', {
      topic: '',
      useWebSearch: true,
    });
    assert.equal(captured!.useWebSearch, true);
  });
});
