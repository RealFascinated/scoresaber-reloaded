"use client";

import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { Box, Play, User, UserX, LucideIcon } from "lucide-react";
import CountUp from "react-countup";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
}

function StatCard({ icon: Icon, title, value }: StatCardProps) {
  return (
    <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
      <div className="relative">
        <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
          <Icon className="size-5" />
        </div>
        <h3 className="text-muted-foreground mb-1 text-sm font-semibold">{title}</h3>
        <p className="text-2xl font-bold">
          <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce preserveValue={true} />
        </p>
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard icon={User} title="Tracked Players" value={statistics.trackedPlayers} />
      <StatCard icon={User} title="Active Players" value={statistics.activePlayers} />
      <StatCard icon={UserX} title="Inactive Players" value={statistics.inactivePlayers} />
      <StatCard icon={Box} title="Tracked Scores" value={statistics.trackedScores} />
      <StatCard icon={Play} title="Stored Replays" value={statistics.storedReplays} />
    </div>
  );
}
