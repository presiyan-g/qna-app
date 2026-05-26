'use client';

import { useRef, useTransition } from 'react';
import { Spinner } from '@/app/_components/Spinner';
import { archiveCommunityAction } from '@/app/actions/communities';

export function ArchiveCommunityButton({
  slug,
  communityName,
}: {
  slug: string;
  communityName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function onConfirm() {
    startTransition(async () => {
      await archiveCommunityAction(slug);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={pending}
        className="q-btn q-btn-clay q-btn-md"
      >
        {pending ? 'Archiving...' : 'Archive community'}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="archive-dialog-title"
        onClose={() => {
          // Reset is handled by the redirect; nothing to do here.
        }}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <h2
            id="archive-dialog-title"
            className="text-lg font-bold text-ink"
          >
            Archive &ldquo;{communityName}&rdquo;?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            It will be hidden from everyone and removed from listings.
            Members, questions, broadcasts, and answers are preserved in
            storage, but it cannot be undone from the UI.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="q-btn q-btn-ghost q-btn-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="q-btn q-btn-danger q-btn-md"
            >
              {pending && <Spinner />}
              {pending ? 'Archiving...' : 'Archive community'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
