import Link from "next/link";
import type { CommunityWithMembership } from "@/services/communities";

/**
 * Featured-communities card on the landing page.
 * The whole tile is one click target — wrapping in a Link gives the
 * pointer cursor on hover and lets users tap anywhere on the card.
 * Visual fidelity matches the design's q-card-hoverable: translate-y
 * lift, primary border, and a soft shadow on hover.
 */
export function CommunityCard({
  community,
}: {
  community: CommunityWithMembership;
}) {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="group flex cursor-pointer flex-col gap-3 rounded-[14px] border border-line bg-card p-5 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_18px_40px_-22px_rgba(31,64,50,0.28)]"
    >
      <header className="flex items-center gap-3">
        <div className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-[9px] bg-primary-soft text-[17px]">
          {community.emoji || community.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight group-hover:text-primary">
            {community.name}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
            {community.memberCount.toLocaleString("en-US")} members
          </div>
        </div>
      </header>

      <p className="text-[13px] leading-relaxed">
        {community.description || "A recurring challenge community."}
      </p>

      <footer className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <div className="flex flex-wrap gap-1.5">
          <span className="q-chip q-chip-primary">{community.cadence}</span>
          {community.category ? (
            <span className="q-chip q-chip-line">{community.category.name}</span>
          ) : null}
        </div>
        <span className="transition-[gap,color] duration-200 ease-out group-hover:text-ink">
          View community →
        </span>
      </footer>
    </Link>
  );
}
