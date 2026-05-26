/**
 * Brand-themed empty state. Dashed border + paper card, centered
 * headline (with optional italic serif accent), muted prose, and
 * an optional CTA slot.
 *
 * Use everywhere a list / panel renders "no items yet" so the
 * design language stays consistent. Keeps it server-renderable —
 * no client behavior, no hooks.
 */
export function EmptyState({
  title,
  titleAccent,
  description,
  action,
  className = '',
}: {
  title: string;
  /** Optional serif-italic phrase appended to the title for warmth. */
  titleAccent?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-dashed border-line bg-card px-6 py-9 text-center ${className}`}
    >
      <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
        {title}
        {titleAccent ? (
          <>
            {' '}
            <span className="serif-italic">{titleAccent}</span>
          </>
        ) : null}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
