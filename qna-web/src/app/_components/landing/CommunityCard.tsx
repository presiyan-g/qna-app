import { formatMemberCount, type CommunitySample } from "./_data/communities";

export function CommunityCard({ community }: { community: CommunitySample }) {
  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-5 transition-transform hover:-translate-y-0.5">
      <header className="flex items-center gap-3">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary-soft text-[17px]">
          {community.emoji}
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight">{community.name}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
            {formatMemberCount(community.memberCount)} members
          </div>
        </div>
      </header>

      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">Today:</span> {community.todayQuestion}
      </p>

      <footer className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span className="rounded-full bg-primary-soft px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-wider text-primary">
          Active now
        </span>
        <span>Closes {community.closesIn}</span>
      </footer>
    </article>
  );
}
