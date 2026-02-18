"use client";

import { env } from "@ssr/common/env";
import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import Request from "@ssr/common/utils/request";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Card from "../card";
import { AppStats } from "../landing/app-statistics";
import ScoreSaberStatisticsChart from "../score/charts/scoresaber-statistics-chart";
import SimpleLink from "../simple-link";
import { Spinner } from "../spinner";

const HmdUsageChart = dynamic(() => import("../score/charts/hmd-usage-chart"), { ssr: false });

export default function StatisticData() {
  const { data: statistics } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => ssrApi.getScoreSaberStatistics(),
    placeholderData: data => data,
  });
  const { data: appStatistics } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => Request.get<AppStatisticsResponse>(env.NEXT_PUBLIC_API_URL + "/statistics"),
    placeholderData: data => data,
  });

  if (statistics == undefined || appStatistics == undefined) {
    return (
      <Card className="flex h-32 items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  return (
    <div className="flex w-full justify-center gap-(--spacing-sm)">
      <article className="flex w-full flex-1 flex-col gap-(--spacing-lg)">
        {statistics && appStatistics ? (
          <Card className="gap-(--spacing-md)">
            <div className="space-y-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-foreground text-lg font-semibold">Game Statistics</h3>
                <SimpleLink
                  href="https://ssr-grafana.fascinated.cc/public-dashboards/19a90072026f442fafa6c371192dddff"
                  target="_blank"
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
                >
                  View more in Grafana →
                </SimpleLink>
              </div>
              <p className="text-muted-foreground text-sm">Daily player activity and metrics</p>
            </div>

            <AppStats
              statistics={appStatistics}
              className="grid grid-cols-1 gap-(--spacing-lg) sm:grid-cols-2 lg:grid-cols-6"
            />
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
