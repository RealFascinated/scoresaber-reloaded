"use client";

import Statistic from "@/components/home/statistic";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { useQuery } from "@tanstack/react-query";
import { kyFetch } from "@ssr/common/utils/utils";
import { Config } from "@ssr/common/config";
import { useEffect, useState } from "react";

type AppStatisticsProps = {
  /**
   * The app statistics.
   */
  initialStatistics: AppStatistics;
};

export function AppStats({ initialStatistics }: AppStatisticsProps) {
  const [statistics, setStatistics] = useState(initialStatistics);

  const { data } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => kyFetch<AppStatistics>(Config.apiUrl + "/statistics"),
  });

  useEffect(() => {
    if (data) {
      setStatistics(data);
    }
  }, [data]);

  return (
    <div className="flex items-center flex-col">
      <p className="font-semibold">Site Statistics</p>
      <Statistic title="Tracked Players" value={statistics.trackedPlayers} />
      <Statistic title="Tracked Scores" value={statistics.trackedScores} />
      <Statistic title="Additional Scores Data" value={statistics.additionalScoresData} />
      <Statistic title="Cached BeatSaver Maps" value={statistics.cachedBeatSaverMaps} />
      <Statistic title="Cached ScoreSaber Leaderboards" value={statistics.cachedScoreSaberLeaderboards} />
    </div>
  );
}
