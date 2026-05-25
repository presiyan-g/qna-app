'use client';

import { useActionState } from 'react';
import {
  archiveCommunityAction,
  suspendUserAction,
  updateCommunityPlacementAction,
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

export function CommunityPlacementForm({
  community,
}: {
  community: {
    id: string;
    isFeatured: boolean;
    featuredRank: number | null;
    directoryRank: number | null;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateCommunityPlacementAction.bind(null, community.id),
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid max-w-md grid-cols-[130px_80px_80px_64px] items-end gap-2"
    >
      <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink">
        <input
          name="isFeatured"
          type="checkbox"
          defaultChecked={community.isFeatured}
          className="h-4 w-4 accent-primary"
        />
        Featured
      </label>
      <label
        className="block w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-primary"
        htmlFor={`featured-rank-${community.id}`}
      >
        Feature
        <input
          id={`featured-rank-${community.id}`}
          name="featuredRank"
          type="number"
          min="0"
          max="9999"
          step="1"
          defaultValue={community.featuredRank ?? ''}
          placeholder="-"
          className="mt-1 min-h-10 w-20 rounded-lg border border-line bg-paper px-3 text-sm font-normal tracking-normal text-ink"
        />
      </label>
      <label
        className="block w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-primary"
        htmlFor={`directory-rank-${community.id}`}
      >
        Browse
        <input
          id={`directory-rank-${community.id}`}
          name="directoryRank"
          type="number"
          min="0"
          max="9999"
          step="1"
          defaultValue={community.directoryRank ?? ''}
          placeholder="-"
          className="mt-1 min-h-10 w-20 rounded-lg border border-line bg-paper px-3 text-sm font-normal tracking-normal text-ink"
        />
      </label>
      <button
        className="min-h-10 w-16 shrink-0 rounded-lg bg-primary text-sm font-bold text-paper disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Save
      </button>
      {state.fieldErrors?.featuredRank ? (
        <p className="text-sm font-bold text-red-700 sm:col-span-4">
          {state.fieldErrors.featuredRank}
        </p>
      ) : null}
      {state.fieldErrors?.directoryRank ? (
        <p className="text-sm font-bold text-red-700 sm:col-span-4">
          {state.fieldErrors.directoryRank}
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-bold text-red-700 sm:col-span-4">
          {state.formError}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-bold text-primary sm:col-span-4">
          Placement saved.
        </p>
      ) : null}
    </form>
  );
}
