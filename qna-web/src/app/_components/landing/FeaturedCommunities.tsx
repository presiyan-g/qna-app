import { EmptyState } from "../EmptyState";
import { CommunityCard } from "./CommunityCard";
import { listFeaturedCommunities } from "@/services/communities";

export async function FeaturedCommunities() {
  const communities = await listFeaturedCommunities({ limit: 9 });

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

        {communities.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <CommunityCard key={c.slug} community={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No communities"
            titleAccent="yet."
            description="Be the first to start a recurring challenge community."
          />
        )}
      </div>
    </section>
  );
}
