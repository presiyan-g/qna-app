'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  createBroadcastAction,
  updateBroadcastAction,
  type BroadcastFormState,
} from '@/app/actions/broadcasts';
import { ImageUploader } from '@/app/_components/ImageUploader';

const INITIAL_STATE: BroadcastFormState = { ok: false };

export function BroadcastComposer({
  slug,
  communityId,
  postId,
  initialBody = '',
  initialImageUrl = '',
  onSaved,
}: {
  slug: string;
  communityId: string;
  postId?: string;
  initialBody?: string;
  initialImageUrl?: string | null;
  onSaved?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = postId
    ? updateBroadcastAction.bind(null, slug, postId)
    : createBroadcastAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  useEffect(() => {
    if (!state.ok) return;
    if (!postId) formRef.current?.reset();
    onSaved?.();
  }, [onSaved, postId, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      {state.ok && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Broadcast saved.
        </div>
      )}
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <FieldError error={state.fieldErrors?.body}>
        <label htmlFor={postId ? `broadcast-body-${postId}` : 'broadcast-body'}>
          Broadcast
        </label>
        <textarea
          id={postId ? `broadcast-body-${postId}` : 'broadcast-body'}
          name="body"
          rows={postId ? 5 : 6}
          maxLength={4000}
          disabled={pending}
          defaultValue={initialBody}
          aria-invalid={state.fieldErrors?.body ? 'true' : undefined}
          className="min-h-32 resize-y rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm leading-6 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65"
          placeholder="Share an update, resource, or winner announcement..."
        />
      </FieldError>

      <div className="grid gap-1.5">
        <ImageUploader
          name="imageUrl"
          scope="broadcast"
          communityId={communityId}
          label="Image (optional)"
          initialUrl={initialImageUrl || null}
          helpText="JPEG, PNG, or WebP up to 5 MB."
        />
        {state.fieldErrors?.imageUrl && (
          <p className="text-[12px] text-red-700">{state.fieldErrors.imageUrl}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-paper transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {pending ? 'Saving...' : postId ? 'Save changes' : 'Post broadcast'}
        </button>
        {postId && onSaved && (
          <button
            type="button"
            onClick={onSaved}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function FieldError({
  children,
  error,
}: {
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5 text-[13px] font-semibold">
      {children}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}
