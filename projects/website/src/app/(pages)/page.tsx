import DataCollection from "@/components/landing/data-collection";
import Friends from "@/components/landing/friends";
import HeroSection from "@/components/landing/hero";
import SiteStats from "@/components/landing/site-stats";

export default async function LandingPage() {
  return (
    <main className="from-landing to-landing w-screen bg-linear-to-b via-[#1a1a1a]">
      <div className="flex flex-col items-center">
        <div className="mt-36 mb-14 flex max-w-[1600px] flex-col gap-64 md:mt-48">
          <HeroSection />
          <DataCollection />
          <Friends />
          <SiteStats />
        </div>
      </div>
    </main>
  );
}
