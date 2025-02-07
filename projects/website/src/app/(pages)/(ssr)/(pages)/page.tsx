import HeroSection from "@/components/landing/hero";
import DataCollection from "@/components/landing/data-collection";
import Friends from "@/components/landing/friends";
import SiteStats from "@/components/landing/site-stats";
import RealtimeScores from "@/components/landing/realtime-scores";

export default async function LandingPage() {
  return (
    <main className="w-screen bg-linear-to-b from-landing via-[#1a1a1a] to-landing">
      <div className="flex flex-col items-center">
        <div className="max-w-[1600px] mt-36 md:mt-48 mb-14 flex flex-col gap-64">
          <HeroSection />
          <DataCollection />
          <Friends />
          <SiteStats />
          <RealtimeScores />
        </div>
      </div>
    </main>
  );
}
