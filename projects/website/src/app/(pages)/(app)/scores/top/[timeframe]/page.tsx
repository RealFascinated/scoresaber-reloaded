import { Metadata } from "next";
import { TopScoresData } from "@/components/score/top/top-scores-data";
import { Timeframe } from "@ssr/common/timeframe";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    title: "ScoreSaber Reloaded - Top Scores",
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
