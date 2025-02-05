import { Metadata } from "next";
import Card from "@/components/card";
import ScoreSaberStatisticsChart from "@/components/platform-statistics/charts/scoresaber-statistics-chart";
import { GamePlatform } from "@ssr/common/model/statistics/game-platform";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { Config } from "@ssr/common/config";

export const revalidate = 300; // Revalidate every 5 minutes

const PLATFORM_NAMES: Record<GamePlatform, string> = {
  [GamePlatform.ScoreSaber]: "ScoreSaber",
} as const;

type StatisticsPageProps = {
  params: Promise<{
    platform: GamePlatform;
  }>;
};

export async function generateMetadata({ params }: StatisticsPageProps): Promise<Metadata> {
  const { platform } = await params;
  const statistics = await ssrApi.getPlatformStatistics(platform);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = formatDateMinimal(yesterday);
  const statisticsData = statistics?.statistics[date];

  const activePlayers = statisticsData?.[Statistic.ActivePlayers] ?? 0;
  const totalScores = statisticsData?.[Statistic.TotalScores];
  const averagePp = statisticsData?.[Statistic.AveragePp];

  const descriptionParts = [
    `Active Players: ${formatNumberWithCommas(activePlayers)}`,
    totalScores && `Scores: ${formatNumberWithCommas(totalScores)}`,
    averagePp && `Average PP: ${formatPp(averagePp)}pp`,
  ].filter(Boolean);

  return {
    title: `${PLATFORM_NAMES[platform]} Statistics`,
    openGraph: {
      siteName: Config.websiteName,
      title: `${PLATFORM_NAMES[platform]} Statistics`,
      description: `${descriptionParts.join("\n")}\n\nClick here to view the statistics for ${PLATFORM_NAMES[platform]}`,
    },
  };
}

export default async function StatisticsPage({ params }: StatisticsPageProps) {
  const { platform } = await params;
  const statistics = await ssrApi.getPlatformStatistics(platform);

  return (
    <main className="w-full flex justify-center">
      <Card className="flex flex-col gap-2 w-full h-fit">
        <div className="text-center">
          <p className="font-semibold">Game Statistics</p>
          <p className="text-gray-400">View the statistics for {PLATFORM_NAMES[platform]}</p>
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
