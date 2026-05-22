import Link from "next/link";

const CHECKLIST = [
  {
    head: "Schedule recurring questions",
    tail: "daily, weekly, or your own cadence.",
  },
  {
    head: "Instant grading + explanations",
    tail: "members learn the moment they answer.",
  },
  {
    head: "Discussion unlocks after answering",
    tail: "no spoilers, no lurkers.",
  },
  {
    head: "Leaderboards & broadcasts",
    tail: "keep the regulars coming back.",
  },
];

export function ForCreators() {
  return (
    <section id="for-creators" className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto grid max-w-[1200px] items-center gap-9 rounded-[20px] border border-line bg-card p-8 md:grid-cols-2 md:p-10">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            For creators
          </p>
          <h3 className="mb-3.5 text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[30px]">
            Building a niche community is{" "}
            <span className="serif-italic">easier than a podcast.</span>
          </h3>
          <p className="mb-5 text-[15px] leading-relaxed text-muted">
            If you teach something — even a narrow slice of it — you have
            enough to launch a community. Schedule one question. Members
            answer, learn, talk. You see exactly who shows up.
          </p>
          <Link
            href="/communities/new"
            className="inline-flex rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper"
          >
            Start your community →
          </Link>
        </div>

        <ul className="grid gap-3.5">
          {CHECKLIST.map((item) => (
            <li key={item.head} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden
                className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
              >
                ✓
              </span>
              <span>
                <strong>{item.head}</strong> — {item.tail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
