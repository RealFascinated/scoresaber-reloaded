import Card from "@/components/card";
import { AppStats } from "@/components/landing/app-statistics";
import HmdUsageChart from "@/components/score/charts/hmd-usage-chart";
import ScoreSaberStatisticsChart from "@/components/score/charts/scoresaber-statistics-chart";
import SimpleLink from "@/components/simple-link";
import { ChartBarIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/solid";
import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `SSR Statistics`,
    description: "View the statistics for SSR",
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: `SSR Statistics`,
      description: "View the statistics for SSR",
    },
  };
}

export default async function StatisticsPage() {
  const statistics = await ssrApi.getScoreSaberPlatformStatistics();

  return (
    <div className="flex w-full justify-center gap-2">
      <article className="flex flex-1 flex-col gap-2">
        {/* Header */}
        <div className="px-4 py-6 md:px-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary rounded-xl p-3 shadow-lg">
              <ChartBarIcon className="size-6" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold">SSR Statistics</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Real-time platform analytics and player insights
              </p>
            </div>
          </div>
        </div>

        {statistics ? (
          <div className="flex flex-col gap-2">
            {/* Game Statistics Section */}
            <Card className="gap-2">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <ChartBarIcon className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Game Statistics</span>
                    <span className="text-muted-foreground text-sm">
                      Daily player activity and metrics
                    </span>
                  </div>
                </div>
                <SimpleLink
                  href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
                  target="_blank"
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  View more in Grafana →
                </SimpleLink>
              </div>

              <div className="border-border/20 border-t px-4 py-4">
                <AppStats />
              </div>

              <div className="px-4 pb-4">
                <ScoreSaberStatisticsChart statistics={statistics.statistics} />
              </div>
            </Card>

            {/* HMD Usage Section */}
            {statistics.statistics.hmdUsage && (
              <Card className="gap-2">
                <div className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <DevicePhoneMobileIcon className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">HMD Usage Distribution</span>
                    <span className="text-muted-foreground text-sm">
                      Popular VR headsets among active players
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4">
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
