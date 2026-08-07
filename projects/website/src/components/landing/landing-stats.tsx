"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { SharedIcons, type SharedDecorativeIcon } from "@/shared-icons";
import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type LandingStat = {
  label: string;
  icon: SharedDecorativeIcon;
  key: keyof AppStatisticsResponse;
};

const STATS: LandingStat[] = [
  { label: "Active Players", icon: SharedIcons.FriendSystemFeatureIcon, key: "activePlayers" },
  { label: "Leaderboards", icon: SharedIcons.ViewLeaderboardIcon, key: "leaderboardCount" },
  { label: "Tracked Scores", icon: SharedIcons.AdvancedAnalyticsFeatureIcon, key: "trackedScores" },
  { label: "Score History", icon: SharedIcons.PlayerHistorySettingsIcon, key: "scoreHistoryScores" },
  { label: "Stored Replays", icon: SharedIcons.WatchReplayIcon, key: "storedReplays" },
  { label: "Unique Players Today", icon: SharedIcons.ScoreDateIcon, key: "uniquePlayersToday" },
];

/**
 * Live stats for the landing page, fetched from the backend `/statistics` endpoint.
 * Values tick upward client-side at the reported velocity until the next fetch.
 */
export function LandingStats() {
  const { data, dataUpdatedAt, isLoading } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => ssrApi.getAppStatistics(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Live values extrapolated from the last fetch, refreshed every second
  const [liveValues, setLiveValues] = useState<Partial<Record<keyof AppStatisticsResponse, number>>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - dataUpdatedAt) / 1000;
      setLiveValues(
        Object.fromEntries(STATS.map(({ key }) => [key, data[key].value + data[key].velocity * elapsed]))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [data, dataUpdatedAt]);

  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3" aria-busy="true">
        {Array.from({ length: STATS.length }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
      {STATS.map(({ label, icon: Icon, key }) => {
        const liveValue = Math.round(liveValues[key] ?? data[key].value);
        return (
          <div
            key={label}
            className="ring-border bg-card flex flex-col items-center gap-1 rounded-xl p-5 text-center ring-1"
          >
            <Icon className="text-muted-foreground mb-1 h-5 w-5" />
            <span className="text-foreground text-xl font-bold tabular-nums">
              {formatNumberWithCommas(liveValue)}
            </span>
            <span className="text-muted-foreground text-xs">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
