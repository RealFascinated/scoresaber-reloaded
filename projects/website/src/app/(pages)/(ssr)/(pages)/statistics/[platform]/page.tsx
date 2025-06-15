import Card from "@/components/card";
import ScoreSaberStatisticsChart from "@/components/platform-statistics/charts/scoresaber-statistics-chart";
import { env } from "@ssr/common/env";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

export async function generateMetadata(): Promise<Metadata> {
  const statistics = await ssrApi.getScoreSaberPlatformStatistics();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = formatDateMinimal(yesterday);
  const statisticsData = statistics?.statistics[date];

  const activePlayers = statisticsData?.[Statistic.ActivePlayers] ?? 0;
  const playerCount = statisticsData?.[Statistic.PlayerCount] ?? 0;

  const descriptionParts = [
    `Daily Unique Players: ${formatNumberWithCommas(activePlayers)}`,
    playerCount && `Active Accounts: ${formatNumberWithCommas(playerCount)}`,
  ].filter(Boolean);

  return {
    title: `ScoreSaber Statistics`,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: `ScoreSaber Statistics`,
      description: `${descriptionParts.join("\n")}\n\nClick here to view the statistics for ScoreSaber`,
    },
  };
}

export default async function StatisticsPage() {
  const statistics = await ssrApi.getScoreSaberPlatformStatistics();

  return (
    <main className="w-full flex justify-center">
      <Card className="flex flex-col gap-2 w-full h-fit">
        <div className="text-center">
          <p className="font-semibold">Game Statistics</p>
          <p className="text-gray-400">View the statistics for ScoreSaber</p>
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
