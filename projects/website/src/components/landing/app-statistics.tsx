"use client";

import Statistic from "@/components/landing/statistic";
import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { Box, Play, User, UserX } from "lucide-react";

export function AppStats() {
  const { data: statistics } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => Request.get<AppStatistics>(env.NEXT_PUBLIC_API_URL + "/statistics"),
    refetchInterval: 1000,
  });

  if (!statistics) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-8 md:gap-12">
      <Statistic
        icon={<User className="size-10" />}
        title="Tracked Players"
        value={statistics.trackedPlayers}
      />
      <Statistic
        icon={<UserX className="size-10" />}
        title="Inactive Players"
        value={statistics.inactivePlayers}
      />
      <Statistic
        icon={<Box className="size-10" />}
        title="Tracked Scores"
        value={statistics.trackedScores}
      />
      <Statistic
        icon={<Play className="size-10" />}
        title="Stored Replays"
        value={statistics.storedReplays}
      />
    </div>
  );
}
