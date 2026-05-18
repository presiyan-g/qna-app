import { HERO_STACK, formatMemberCount } from "./_data/communities";

const STACK_POSITIONS = [
  "top-0 left-0 -rotate-[3.5deg]",
  "top-[80px] left-[90px] rotate-[1.5deg] z-10",
  "top-[175px] left-[30px] -rotate-1",
];

export function Hero() {
  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 md:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Discover daily Q&amp;A communities
          </p>
          <h1 className="mb-4 text-[40px] font-bold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            Find your people.{" "}
            <span className="serif-italic">One question at a time.</span>
          </h1>
          <p className="mb-6 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            Niche communities — from AI builders to chess tacticians —
            publish one question a day. You answer in 30 seconds, see the
            explanation instantly, and unlock the discussion only after
            you&apos;ve taken a swing.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#discover"
              className="rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper"
            >
              Browse communities →
            </a>
            <a
              href="#"
              className="rounded-full border border-line px-[22px] py-[13px] text-sm font-semibold text-ink"
            >
              Start your own
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-[320px] w-full max-w-[420px]">
          {HERO_STACK.map((c, i) => (
            <article
              key={c.slug}
              className={`absolute w-[260px] rounded-[14px] border border-line bg-card px-[18px] py-4 shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)] ${STACK_POSITIONS[i]}`}
            >
              <div className="mb-2.5 flex items-center gap-[11px]">
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary-soft text-[17px]">
                  {c.emoji}
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">{c.name}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                    {formatMemberCount(c.memberCount)} members
                  </div>
                </div>
              </div>
              <div className="text-[13px] leading-snug">{c.todayQuestion}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
