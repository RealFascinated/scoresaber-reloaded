"use client";

import Statistic from "@/components/landing/statistic";
import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { Box, User } from "lucide-react";
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
    queryFn: () => Request.get<AppStatistics>(env.NEXT_PUBLIC_API_URL + "/statistics"),
  });

  useEffect(() => {
    if (data) {
      setStatistics(data);
    }
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-7 md:grid-cols-4 md:gap-12 lg:grid-cols-5">
      <Statistic
        icon={<User className="size-10" />}
        title="Tracked Players"
        value={statistics.trackedPlayers}
      />
      <Statistic
        icon={<Box className="size-10" />}
        title="Tracked Scores"
        value={statistics.trackedScores}
      />
    </div>
  );
}
