/**
 * Inline loading spinner — a 14px circle with a primary-arc on a
 * muted track, rotating continuously. Used inside q-btn pending
 * states to indicate the action is in flight.
 *
 * Pure SVG + CSS, no JS animation. Color inherits from
 * `currentColor` so a clay button gets a clay-tinted spinner and
 * a primary button gets a paper-tinted one — just like real text.
 * That keeps the spinner legible on every button variant without
 * passing a color prop.
 *
 * Honor prefers-reduced-motion via the @keyframes guard in
 * globals.css (added alongside this component).
 */
export function Spinner({
  size = 14,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`q-spinner ${className}`}
    >
      {/* Track — semi-transparent so the moving arc reads as the
          progress indicator without needing a second color. */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      {/* Arc — covers ~70deg, the rotating bit. strokeDasharray
          + circumference (≈ 56.5 for r=9) gives the partial arc. */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="11 56.5"
      />
    </svg>
  );
}
