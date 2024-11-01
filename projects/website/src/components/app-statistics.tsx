"use client";

import Statistic from "@/components/home/statistic";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import { useQuery } from "@tanstack/react-query";
import { kyFetch } from "@ssr/common/utils/utils";
import { Config } from "@ssr/common/config";
import { useEffect, useState } from "react";
import { Box, List, Sword, SwordIcon, TrendingUp, User } from "lucide-react";

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
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-7 md:grid-cols-4 md:gap-12 lg:grid-cols-5">
      <Statistic icon={<User className="size-10" />} title="Tracked Players" value={statistics.trackedPlayers} />
      <Statistic icon={<Box className="size-10" />} title="Tracked Scores" value={statistics.trackedScores} />
      <Statistic
        icon={<TrendingUp className="size-10" />}
        title="Additional Scores Data"
        value={statistics.additionalScoresData}
      />
      <Statistic
        icon={<SwordIcon className="size-10" />}
        title="Cached BeatSaver Maps"
        value={statistics.cachedBeatSaverMaps}
      />
      <Statistic
        icon={<List className="size-10" />}
        title="Cached ScoreSaber Leaderboards"
        value={statistics.cachedScoreSaberLeaderboards}
      />
    </div>
  );
}
