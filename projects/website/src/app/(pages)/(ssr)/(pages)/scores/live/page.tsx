import Card from "@/components/card";
import ScoreFeed from "@/components/platform/scoresaber/score/score-feed/score-feed";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Score Feed",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Live Scores",
    description: "View the live scores set by players on ScoreSaber.",
  },
};

export default function ScoresPage() {
  return (
    <main className="flex w-full justify-center">
      <Card className="flex h-fit w-full flex-col gap-2 xl:w-[75%]">
        <div>
          <p className="font-semibold'">Live Score Feed</p>
          <p className="text-gray-400">This is the real-time scores being set on ScoreSaber.</p>
        </div>

        <ScoreFeed />
      </Card>
    </main>
  );
}
