import { Metadata } from "next";
import { TopScoresData } from "@/components/score/top/top-scores-data";
import { Timeframe } from "@ssr/common/timeframe";
import { Config } from "@ssr/common/config";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    siteName: Config.websiteName,
    title: "Top Scores",
    description: "View the top 50 scores set by players on ScoreSaber.",
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
