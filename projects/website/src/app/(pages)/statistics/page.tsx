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
    <div className="flex w-full justify-center gap-(--spacing-sm)">
      <article className="flex w-full flex-1 flex-col gap-(--spacing-sm)">
        {/* Header */}
        <div className="px-(--spacing-xl) py-(--spacing-2xl) md:px-(--spacing-2xl)">
          <div className="flex items-center gap-(--spacing-xl)">
            <div className="bg-primary/10 text-primary rounded-(--radius-xl) p-(--spacing-lg) shadow-lg">
              <ChartBarIcon className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">SSR Statistics</h1>
              <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
                Real-time platform analytics and player insights
              </p>
            </div>
          </div>
        </div>

        {statistics ? (
          <div className="flex flex-col gap-(--spacing-sm)">
            {/* Game Statistics Section */}
            <Card>
              <div className="mb-(--spacing-lg)">
                <div className="flex flex-col gap-(--spacing-lg) sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-(--spacing-lg)">
                    <div className="bg-primary/10 text-primary rounded-(--radius-lg) p-(--spacing-sm)">
                      <ChartBarIcon className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-lg font-semibold">Game Statistics</h2>
                      <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
                        Daily player activity and metrics
                      </p>
                    </div>
                  </div>
                  <SimpleLink
                    href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
                    target="_blank"
                    className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
                  >
                    View more in Grafana →
                  </SimpleLink>
                </div>
              </div>

              <div className="border-border/20 border-t pt-(--spacing-lg)">
                <AppStats />
              </div>

              <div className="pt-(--spacing-lg)">
                <ScoreSaberStatisticsChart statistics={statistics.statistics} />
              </div>
            </Card>

            {/* HMD Usage Section */}
            {statistics.statistics.hmdUsage && (
              <Card>
                <div className="mb-(--spacing-lg)">
                  <div className="flex items-center gap-(--spacing-lg)">
                    <div className="bg-primary/10 text-primary rounded-(--radius-lg) p-(--spacing-sm)">
                      <DevicePhoneMobileIcon className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-lg font-semibold">HMD Usage Distribution</h2>
                      <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
                        Popular VR headsets among active players
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-(--spacing-lg)">
                  <HmdUsageChart hmdUsage={statistics.statistics.hmdUsage} />
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <div className="flex h-32 items-center justify-center py-(--spacing-2xl)">
              <p className="text-muted-foreground">Unable to load statistics, missing data...</p>
            </div>
          </Card>
        )}
      </article>
    </div>
  );
}
