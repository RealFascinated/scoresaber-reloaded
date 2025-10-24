"use client";

import Statistic from "@/components/landing/statistic";
import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { Box, Play, User, UserX } from "lucide-react";
import CountUp from "react-countup";

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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
        <div className="relative">
          <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
            <User className="size-5" />
          </div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Tracked Players</h3>
          <p className="text-2xl font-bold">
            <CountUp
              end={statistics.trackedPlayers}
              duration={1.2}
              enableScrollSpy
              scrollSpyOnce
              preserveValue={true}
            />
          </p>
        </div>
      </div>

      <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
        <div className="relative">
          <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
            <UserX className="size-5" />
          </div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Inactive Players</h3>
          <p className="text-2xl font-bold">
            <CountUp
              end={statistics.inactivePlayers}
              duration={1.2}
              enableScrollSpy
              scrollSpyOnce
              preserveValue={true}
            />
          </p>
        </div>
      </div>

      <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
        <div className="relative">
          <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
            <Box className="size-5" />
          </div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Tracked Scores</h3>
          <p className="text-2xl font-bold">
            <CountUp
              end={statistics.trackedScores}
              duration={1.2}
              enableScrollSpy
              scrollSpyOnce
              preserveValue={true}
            />
          </p>
        </div>
      </div>

      <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
        <div className="relative">
          <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
            <Play className="size-5" />
          </div>
          <h3 className="text-muted-foreground mb-1 text-sm font-semibold">Stored Replays</h3>
          <p className="text-2xl font-bold">
            <CountUp
              end={statistics.storedReplays}
              duration={1.2}
              enableScrollSpy
              scrollSpyOnce
              preserveValue={true}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
