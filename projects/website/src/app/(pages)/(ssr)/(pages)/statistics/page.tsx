import Card from "@/components/card";
import HmdUsageChart from "@/components/platform-statistics/charts/hmd-usage-chart";
import ScoreSaberStatisticsChart from "@/components/platform-statistics/charts/scoresaber-statistics-chart";
import { ChartBarIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/solid";
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
  const statisticsData = statistics?.statistics.daily[date];

  const activePlayers = statisticsData?.[Statistic.DailyUniquePlayers] ?? 0;
  const playerCount = statisticsData?.[Statistic.ActiveAccounts] ?? 0;

  const descriptionParts = [
    `Daily Unique Players: ${formatNumberWithCommas(activePlayers)}`,
    playerCount && `Active Accounts: ${formatNumberWithCommas(playerCount)}`,
  ].filter(Boolean);

  return {
    title: `ScoreSaber Statistics`,
    description: descriptionParts.join("\n"),
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
    <div className="flex w-full justify-center gap-2">
      <article className="flex flex-1 flex-col gap-2">
        {/* Header */}
        <div className="border-border/50 flex items-center justify-between border-b px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-foreground text-xl font-semibold">ScoreSaber Statistics</h1>
          </div>
        </div>

        {statistics ? (
          <div className="flex flex-col gap-2">
            {/* Game Statistics Section */}
            <Card className="gap-1">
              <div className="flex items-center gap-3 p-4">
                <div className="bg-primary/20 rounded-lg p-2">
                  <ChartBarIcon className="text-primary size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Game Statistics</span>
                  <span className="text-muted-foreground text-sm">
                    Daily player activity and account growth
                  </span>
                </div>
              </div>
              <div className="p-4 pt-0">
                <ScoreSaberStatisticsChart statistics={statistics.statistics} />
              </div>
            </Card>

            {/* HMD Usage Section */}
            {statistics.statistics.hmdUsage && (
              <Card className="gap-1">
                <div className="flex items-center gap-3 p-4">
                  <div className="bg-primary/20 rounded-lg p-2">
                    <DevicePhoneMobileIcon className="text-primary size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">HMD Usage</span>
                    <span className="text-muted-foreground text-sm">
                      Distribution of HMDs used by active players
                    </span>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <HmdUsageChart hmdUsage={statistics.statistics.hmdUsage} />
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-6">
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">Unable to load statistics, missing data...</p>
            </div>
          </Card>
        )}
      </article>
    </div>
  );
}
