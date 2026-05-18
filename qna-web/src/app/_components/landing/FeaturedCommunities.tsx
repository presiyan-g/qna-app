import { CommunityCard } from "./CommunityCard";
import { FEATURED_COMMUNITIES } from "./_data/communities";

export function FeaturedCommunities() {
  return (
    <section id="discover" className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-11 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Featured communities
          </p>
          <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em] md:text-[36px]">
            Find the corner of the internet{" "}
            <span className="serif-italic">that fits you.</span>
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_COMMUNITIES.map((c) => (
            <CommunityCard key={c.slug} community={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
