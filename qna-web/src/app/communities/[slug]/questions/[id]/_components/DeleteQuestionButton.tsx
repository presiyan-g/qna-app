'use client';

import { useRef, useTransition } from 'react';
import { deleteQuestionAction } from '@/app/actions/questions';

export function DeleteQuestionButton({
  slug,
  questionId,
}: {
  slug: string;
  questionId: string;
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
      await deleteQuestionAction(slug, questionId);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={pending}
        className="cursor-pointer rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Deleting...' : 'Delete'}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-question-dialog-title"
        className="m-auto w-[min(460px,calc(100vw-32px))] rounded-xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <h2
            id="delete-question-dialog-title"
            className="text-lg font-bold text-ink"
          >
            Delete this question?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Members who already answered will keep their points, but the
            question will be hidden from the community. This cannot be undone
            from the UI.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              className="cursor-pointer rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="cursor-pointer rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Deleting...' : 'Delete question'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
