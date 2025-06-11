import { TopScoresData } from "@/components/platform/scoresaber/score/top/top-scores-data";
import { env } from "@ssr/common/env";
import { Timeframe } from "@ssr/common/timeframe";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Top Scores",
    description: "View the top scores set by players on ScoreSaber.",
  },
};

type TopScoresPageProps = {
  params: Promise<{
    timeframe: Timeframe;
  }>;
};

export default async function TopScoresPage({ params }: TopScoresPageProps) {
  const { timeframe } = await params;

  return (
    <main className="w-full flex justify-center">
      <TopScoresData timeframe={timeframe} />
    </main>
  );
}
