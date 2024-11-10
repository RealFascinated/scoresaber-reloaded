import { Metadata } from "next";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import Card from "@/components/card";
import ActivePlayersAndScoresSetChart from "@/components/platform-statistics/charts/active-players-and-scores-set-chart";
import { getPlatformStatistics } from "@ssr/common/utils/statistic.util";

export const metadata: Metadata = {
  title: "Statistics",
  openGraph: {
    title: "ScoreSaber Reloaded - Statistics",
    description: "View the game statistics!",
  },
};

type StatisticsPageProps = {
  params: Promise<{
    platform: GamePlatform;
  }>;
};

const names = new Map<GamePlatform, string>([[GamePlatform.ScoreSaber, "ScoreSaber"]]);

export default async function TopScoresPage({ params }: StatisticsPageProps) {
  const { platform } = await params;
  const statistics = await getPlatformStatistics(platform);

  return (
    <main className="w-full flex justify-center">
      <Card className="flex flex-col gap-2 w-full h-fit xl:w-[75%]">
        <div className="text-center">
          <p className="font-semibold'">Game Statistics</p>
          <p className="text-gray-400">View the statistics for {names.get(platform)}</p>
        </div>

        {statistics ? (
          <ActivePlayersAndScoresSetChart statistics={statistics.statistics} />
        ) : (
          <div className="flex justify-center">
            <p>Missing data, nothing to display...</p>
          </div>
        )}
      </Card>
    </main>
  );
}
