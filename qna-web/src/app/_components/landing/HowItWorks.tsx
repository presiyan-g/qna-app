const STEPS = [
  {
    n: 1,
    title: "Pick a community",
    body: "Join one that fits — daily, weekly, your call.",
  },
  {
    n: 2,
    title: "Answer the question",
    body: "Submit in seconds. See the explanation instantly.",
  },
  {
    n: 3,
    title: "Unlock the discussion",
    body: "Comments open only after you've answered.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-primary/10 bg-primary-soft px-6 py-7 md:px-12">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[auto_1fr_1fr_1fr] md:items-center md:gap-8">
        <div className="md:border-r md:border-primary/15 md:pr-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            How it works
          </p>
          <p className="mt-1 text-sm font-semibold leading-tight">
            A daily loop that <span className="serif-italic">closes.</span>
          </p>
        </div>

        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-paper">
              {s.n}
            </div>
            <div>
              <div className="text-[13px] font-bold leading-tight">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
