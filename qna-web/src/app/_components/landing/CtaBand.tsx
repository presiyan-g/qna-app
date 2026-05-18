export function CtaBand() {
  return (
    <section className="px-6 pb-16 md:px-12">
      <div className="mx-auto max-w-[1200px] rounded-[20px] bg-primary px-8 py-14 text-center text-paper md:px-12">
        <h3 className="mb-3.5 text-[32px] font-bold leading-tight tracking-[-0.02em] md:text-[38px]">
          Pick a community.{" "}
          <span
            className="font-serif italic font-normal"
            style={{ color: "var(--color-accent)" }}
          >
            Answer today&apos;s question.
          </span>
        </h3>
        <p className="mb-6 text-base text-paper/75">
          It takes 30 seconds. Tomorrow there&apos;s another one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#discover"
            className="rounded-full bg-accent px-[22px] py-[13px] text-sm font-semibold text-[#2A2A28]"
          >
            Browse communities →
          </a>
          <a
            href="#"
            className="rounded-full border border-paper/30 px-[22px] py-[13px] text-sm font-semibold text-paper"
          >
            Start your own
          </a>
        </div>
      </div>
    </section>
  );
}
