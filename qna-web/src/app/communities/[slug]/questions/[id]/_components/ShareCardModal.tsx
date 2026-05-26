'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AnswerChoiceResource } from '@/services/answers';

type Props = {
  community: {
    name: string;
    emoji: string | null;
    cadence: string;
  };
  prompt: string;
  choice: AnswerChoiceResource;
};

/**
 * Printable-feeling share card shown after a correct answer.
 *
 * The trigger is rendered alongside the result panel — clicking it
 * opens a centered modal with the brand's primary-green poster and
 * an accent-gold corner accent. Esc and backdrop click both close.
 *
 * Implementation notes:
 * - The dialog overlay is rendered via createPortal to document.body
 *   so it escapes any ancestor stacking/containing-block context.
 *   Without the portal, an ancestor with `transform` (we add one for
 *   the result-panel entrance animation via q-anim-in's fill-mode
 *   `both`) traps position:fixed children inside its bounds — which
 *   manifested as the backdrop only covering the result card.
 * - We're not using a native <dialog> because we want fade-in
 *   animations + a styled backdrop, and dialog ::backdrop has
 *   patchy support for animation across browsers.
 * - Body scroll is locked while open so the modal feels modal —
 *   restored on close even if the user navigates away.
 * - The portal is only created after the dialog is opened, which only happens
 *   in the browser.
 */
export function ShareCardModal({ community, prompt, choice }: Props) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    // Park the previous overflow value so we don't clobber a parent's
    // override (e.g. when an outer layout intentionally locks scroll).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const overlay =
    open ? (
      <div
        className="q-modal-backdrop"
        onClick={() => setOpen(false)}
        role="presentation"
      >
          <div
            className="q-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-title"
          >
            <header className="mb-[18px] flex items-baseline justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Share
                </p>
                <h3
                  id="share-card-title"
                  className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.01em]"
                >
                  Your correct answer.
                </h3>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer border-0 bg-transparent p-1 text-[22px] leading-none text-muted transition-colors hover:text-ink"
              >
                ×
              </button>
            </header>

            <div className="q-share-card">
              <div className="relative z-[1] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[17px]"
                    style={{ background: 'rgba(250,246,236,0.15)' }}
                    aria-hidden
                  >
                    {community.emoji || community.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-[13px] font-bold">{community.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.10em] opacity-70">
                      {community.cadence}
                    </div>
                  </div>
                </div>
                <span className="q-share-wm">Quorum</span>
              </div>

              <p className="relative z-[1] mb-4 mt-6 text-[22px] font-bold leading-[1.25] tracking-[-0.01em]">
                &ldquo;{prompt}&rdquo;
              </p>

              <div
                className="relative z-[1] flex items-center gap-3 rounded-[10px] border p-3.5"
                style={{
                  background: 'rgba(250,246,236,0.10)',
                  borderColor: 'rgba(250,246,236,0.2)',
                }}
              >
                <span
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--color-accent)', color: '#2A2A28' }}
                  aria-hidden
                >
                  <Check size={16} strokeWidth={3} />
                </span>
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Got it
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    {choice.position}. {choice.label}
                  </div>
                </div>
              </div>

              <p
                className="relative z-[1] mt-5 text-right text-xs opacity-80"
              >
                <span
                  className="font-serif italic font-normal"
                  style={{ color: 'rgba(250,246,236,0.85)' }}
                >
                  One question at a time.
                </span>
              </p>
            </div>

            <div className="mt-[18px] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="q-btn q-btn-ghost q-btn-md"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="q-btn q-btn-primary q-btn-md"
              >
                Save as PNG
              </button>
            </div>
          </div>
        </div>
      ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="q-btn q-btn-lake q-btn-sm"
      >
        Share →
      </button>
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
