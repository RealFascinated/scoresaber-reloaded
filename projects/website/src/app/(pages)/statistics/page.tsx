import Card from "@/components/card";
import { AppStats } from "@/components/landing/app-statistics";
import HmdUsageChart from "@/components/score/charts/hmd-usage-chart";
import ScoreSaberStatisticsChart from "@/components/score/charts/scoresaber-statistics-chart";
import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";
import Link from "next/link";

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
      <article className="flex w-full flex-1 flex-col gap-(--spacing-lg)">
        {statistics ? (
          <Card className="gap-(--spacing-md)">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-lg font-semibold">Game Statistics</h3>
                <Link
                  href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
                  target="_blank"
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
                >
                  View more in Grafana →
                </Link>
              </div>
              <p className="text-muted-foreground text-sm">Daily player activity and metrics</p>
            </div>

            <AppStats className="grid grid-cols-1 gap-(--spacing-lg) md:grid-cols-2 lg:grid-cols-6" />
            <ScoreSaberStatisticsChart statistics={statistics.statistics} />
            <HmdUsageChart hmdUsage={statistics.statistics.hmdUsage} />
          </Card>
        ) : (
          <Card className="gap-(--spacing-lg)">
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">Unable to load statistics, missing data...</p>
            </div>
          </Card>
        )}
      </article>
    </div>
  );
}
