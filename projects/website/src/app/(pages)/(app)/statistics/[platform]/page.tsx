import { Metadata } from "next";
import Card from "@/components/card";
import ScoreSaberStatisticsChart from "@/components/platform-statistics/charts/scoresaber-statistics-chart";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import { ssrApi } from "@ssr/common/utils/ssr-api";

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Statistics",
  openGraph: {
    siteName: "ScoreSaber Reloaded",
    title: "Statistics",
    description: "View the game statistics!",
  },
};

type StatisticsPageProps = {
  params: Promise<{
    platform: GamePlatform;
  }>;
};

const names = {
  [GamePlatform.ScoreSaber]: "ScoreSaber",
};

export default async function TopScoresPage({ params }: StatisticsPageProps) {
  const { platform } = await params;
  const statistics = await ssrApi.getPlatformStatistics(platform);

  return (
    <main className="w-full flex justify-center">
      <Card className="flex flex-col gap-2 w-full h-fit">
        <div className="text-center">
          <p className="font-semibold'">Game Statistics</p>
          <p className="text-gray-400">View the statistics for {names[platform]}</p>
        </div>

        {statistics ? (
          <ScoreSaberStatisticsChart statistics={statistics.statistics} />
        ) : (
          <div className="flex justify-center">
            <p>Missing data, nothing to display...</p>
          </div>
        )}
      </Card>
    </main>
  );
}
