'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { generateQuestionDraftAction } from '@/app/actions/ai-drafts';
import type {
  AIDraftActionState,
  AIDraftErrorCode,
} from '@/app/actions/ai-drafts.core';
import type { Draft } from '@/lib/ai/question-drafts';

const COOLDOWN_HINT_MS = 5000;
const UNDO_TIMEOUT_MS = 10_000;

const ERROR_MESSAGES: Record<AIDraftErrorCode, string> = {
  unauthenticated: 'Please sign in again.',
  forbidden: 'Only community creators can use AI drafts.',
  validation_failed: 'Topic too long (max 500 characters).',
  quota_exhausted: "You've used all your AI drafts today. Try again tomorrow.",
  cooldown_active: 'Slow down a bit — wait a few seconds.',
  safety_blocked:
    "The AI couldn't generate a question for that topic. Try a different one.",
  provider_timeout: 'The AI took too long. Try again.',
  provider_error: "Couldn't reach the AI. Try again in a moment.",
  invalid_response: 'The AI returned an unexpected response. Try again.',
};

type Props = {
  slug: string;
  initialRemainingQuota: number | null;
  onApplyDraft: (draft: Draft) => void;
  onUndo: () => void;
};

export function AIDraftPanel({
  slug,
  initialRemainingQuota,
  onApplyDraft,
  onUndo,
}: Props) {
  const topicId = useId();
  const [topic, setTopic] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [remaining, setRemaining] = useState(initialRemainingQuota);
  const [error, setError] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!showUndo) return;
    const t = setTimeout(() => setShowUndo(false), UNDO_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [showUndo]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((v) => Math.max(0, v - 100)), 100);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const onGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result: AIDraftActionState = await generateQuestionDraftAction(
        slug,
        { topic, useWebSearch },
      );
      if (result.ok) {
        onApplyDraft(result.draft);
        setRemaining(result.remainingQuota);
        setShowUndo(true);
        setCooldownLeft(COOLDOWN_HINT_MS);
      } else {
        setError(ERROR_MESSAGES[result.code] ?? 'Something went wrong.');
        if (result.code === 'cooldown_active' && result.retryAfterMs) {
          setCooldownLeft(result.retryAfterMs);
        }
      }
    });
  };

  const onUndoClick = () => {
    onUndo();
    setShowUndo(false);
  };

  const disabled = pending || cooldownLeft > 0;
  const remainingLabel =
    remaining === null
      ? null
      : `${remaining} AI draft${remaining === 1 ? '' : 's'} left today`;

  return (
    <div className="mb-6 rounded-lg border border-line bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor={topicId}
            className="text-[13px] font-semibold"
          >
            Draft with AI
          </label>
          <textarea
            id={topicId}
            rows={2}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value.slice(0, 500));
              if (error) setError(null);
            }}
            placeholder="What should this question be about? (optional)"
            className="mt-1 w-full resize-none rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <label className="mt-2 flex items-center gap-2 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={useWebSearch}
              onChange={(e) => setUseWebSearch(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Use web search for accuracy (slower)
          </label>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled}
            aria-busy={pending}
            className="cursor-pointer rounded-full bg-primary px-5 py-3 text-sm font-bold text-paper transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? 'Drafting...'
              : cooldownLeft > 0
                ? `Wait ${Math.ceil(cooldownLeft / 1000)}s`
                : 'Draft with AI'}
          </button>
          {remainingLabel && (
            <span className="text-[11px] font-medium text-muted">
              {remainingLabel}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
        >
          {error}
        </div>
      )}

      {showUndo && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-[13px] text-primary"
        >
          <span>AI filled this in.</span>
          <button
            type="button"
            onClick={onUndoClick}
            className="cursor-pointer rounded-full px-2 py-0.5 font-semibold underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
