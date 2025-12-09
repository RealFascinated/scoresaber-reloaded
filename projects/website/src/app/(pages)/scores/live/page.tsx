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
    <main className="flex w-full flex-col items-center justify-center gap-(--spacing-xl)">
      <Card className="flex h-fit w-full flex-col xl:w-[75%]">
        <h1 className="text-lg font-semibold">Live Score Feed</h1>
        <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
          This is the real-time scores being set on ScoreSaber.
        </p>
      </Card>

      <Card className="flex h-fit w-full flex-col xl:w-[75%]">
        <ScoreFeed />
      </Card>
    </main>
  );
}
