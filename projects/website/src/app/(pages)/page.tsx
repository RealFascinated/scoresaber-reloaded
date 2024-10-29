import HeroSection from "@/components/home/hero";
import DataCollection from "@/components/home/data-collection";
import Friends from "@/components/home/friends";
import SiteStats from "@/components/home/site-stats";
import RealtimeScores from "@/components/home/realtime-scores";

export default async function HomePage() {
  return (
    <main className="-mt-3 w-screen min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f]">
      <div className="flex flex-col items-center">
        <div className="max-w-screen-2xl mt-48 mb-14 flex flex-col gap-64">
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
