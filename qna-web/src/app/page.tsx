import { redirect } from "next/navigation";
import { AUTHENTICATED_HOME_PATH, getSession } from "@/services/auth";
import { Nav } from "./_components/landing/Nav";
import { Hero } from "./_components/landing/Hero";
import { FeaturedCommunities } from "./_components/landing/FeaturedCommunities";
import { HowItWorks } from "./_components/landing/HowItWorks";
import { ForCreators } from "./_components/landing/ForCreators";
import { CtaBand } from "./_components/landing/CtaBand";
import { Footer } from "./_components/landing/Footer";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(AUTHENTICATED_HOME_PATH);

  return (
    <main className="flex flex-col flex-1 bg-paper text-ink">
      <Nav />
      <Hero />
      <FeaturedCommunities />
      <HowItWorks />
      <ForCreators />
      <CtaBand />
      <Footer />
    </main>
  );
}
