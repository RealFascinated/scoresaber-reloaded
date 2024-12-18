import HeroSection from "@/components/home/hero";
import DataCollection from "@/components/home/data-collection";
import Friends from "@/components/home/friends";
import SiteStats from "@/components/home/site-stats";
import RealtimeScores from "@/components/home/realtime-scores";

export default async function HomePage() {
  return (
    <main className="w-screen bg-gradient-to-b from-landing via-[#1a1a1a] to-landing">
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
