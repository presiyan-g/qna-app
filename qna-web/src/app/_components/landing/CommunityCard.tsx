import Link from "next/link";
import type { CommunityWithMembership } from "@/services/communities";

export function CommunityCard({
  community,
}: {
  community: CommunityWithMembership;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-5 transition-transform hover:-translate-y-0.5">
      <header className="flex items-center gap-3">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary-soft text-[17px]">
          {community.emoji || community.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <Link
            href={`/communities/${community.slug}`}
            className="text-[15px] font-bold leading-tight hover:underline"
          >
            {community.name}
          </Link>
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
          <span className="rounded-full bg-primary-soft px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-wider text-primary">
            {community.cadence}
          </span>
          {community.category ? (
            <span className="rounded-full border border-line px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-wider text-muted">
              {community.category.name}
            </span>
          ) : null}
        </div>
        <Link href={`/communities/${community.slug}`} className="hover:text-ink">
          View community
        </Link>
      </footer>
    </article>
  );
}
