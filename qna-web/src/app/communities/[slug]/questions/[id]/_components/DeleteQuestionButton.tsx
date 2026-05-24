'use client';

import { useRef, useState, useTransition } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteQuestionAction(slug, questionId);
        // Successful path redirects server-side, so this line is unreachable.
      } catch (err) {
        // Next.js redirect() throws a special error caught above — anything that
        // lands here is a real failure (permission denied, network, etc.).
        const isRedirect =
          err && typeof err === 'object' && 'digest' in err &&
          typeof (err as { digest?: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
        if (isRedirect) throw err;
        setError(
          err instanceof Error ? err.message : 'Could not delete the question.',
        );
      }
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
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}
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
