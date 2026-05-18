import { Nav } from "./_components/landing/Nav";
import { Hero } from "./_components/landing/Hero";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <Nav />
      <Hero />
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [featured communities placeholder]
      </section>
      <section className="bg-primary-soft px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [how it works placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [for creators placeholder]
      </section>
      <section className="px-6 py-16 text-center text-xs uppercase tracking-widest text-muted">
        [final CTA placeholder]
      </section>
      <section className="border-t border-line px-6 py-8 text-center text-xs uppercase tracking-widest text-muted">
        [footer placeholder]
      </section>
    </main>
  );
}
