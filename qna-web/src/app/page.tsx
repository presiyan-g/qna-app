import { Nav } from "./_components/landing/Nav";
import { Hero } from "./_components/landing/Hero";
import { FeaturedCommunities } from "./_components/landing/FeaturedCommunities";
import { HowItWorks } from "./_components/landing/HowItWorks";
import { ForCreators } from "./_components/landing/ForCreators";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <Nav />
      <Hero />
      <FeaturedCommunities />
      <HowItWorks />
      <ForCreators />
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [final CTA placeholder]
      </section>
      <section className="border-t border-line px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [footer placeholder]
      </section>
    </main>
  );
}
