'use client';

import { useActionState } from 'react';
import {
  archiveCommunityAction,
  suspendUserAction,
  type AdminActionState,
} from '../actions';

const initialState: AdminActionState = { ok: false };

export function SuspendUserForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(
    suspendUserAction.bind(null, userId),
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-line bg-card p-4"
    >
      <label className="block text-sm font-bold" htmlFor="suspend-reason">
        Suspension reason
      </label>
      <textarea
        id="suspend-reason"
        name="reason"
        className="min-h-24 w-full rounded-lg border border-line bg-paper p-3 text-sm"
        required
      />
      {state.fieldErrors?.reason ? (
        <p className="text-sm font-bold text-red-700">
          {state.fieldErrors.reason}
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-bold text-red-700">{state.formError}</p>
      ) : null}
      <button
        className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Suspend user
      </button>
    </form>
  );
}

export function ArchiveCommunityForm({ communityId }: { communityId: string }) {
  const [state, formAction, isPending] = useActionState(
    archiveCommunityAction.bind(null, communityId),
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-line bg-card p-4"
    >
      <label
        className="block text-sm font-bold"
        htmlFor={`archive-reason-${communityId}`}
      >
        Archive reason
      </label>
      <textarea
        id={`archive-reason-${communityId}`}
        name="reason"
        className="min-h-20 w-full rounded-lg border border-line bg-paper p-3 text-sm"
        required
      />
      {state.fieldErrors?.reason ? (
        <p className="text-sm font-bold text-red-700">
          {state.fieldErrors.reason}
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-bold text-red-700">{state.formError}</p>
      ) : null}
      <button
        className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Archive community
      </button>
    </form>
  );
}
