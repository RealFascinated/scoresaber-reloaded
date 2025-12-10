"use client";

import { cn } from "@/common/utils";
import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { Box, LucideIcon, Play, User, UserX } from "lucide-react";
import CountUp from "react-countup";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
}

function StatCard({ icon: Icon, title, value }: StatCardProps) {
  return (
    <div className="border-primary/20 from-accent-deep/50 to-accent/50 group relative overflow-hidden rounded-xl border bg-linear-to-br p-(--spacing-lg)">
      <div className="relative">
        <div className="bg-primary/10 text-primary mb-(--spacing-md) inline-flex rounded-lg p-(--spacing-sm)">
          <Icon className="size-5" />
        </div>
        <h3 className="text-muted-foreground mb-(--spacing-xs) text-sm font-semibold">{title}</h3>
        <p className="text-2xl font-bold">
          <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce preserveValue={true} />
        </p>
      </div>
    </div>
  );
}

export function AppStats({ className }: { className?: string }) {
  const { data: statistics } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => Request.get<AppStatistics>(env.NEXT_PUBLIC_API_URL + "/statistics"),
    refetchInterval: 1000,
  });

  if (!statistics) {
    return null;
  }

  return (
    <div className={className}>
      <StatCard icon={User} title="Active Players" value={statistics.activePlayers} />
      <StatCard icon={UserX} title="Inactive Players" value={statistics.inactivePlayers} />
      <StatCard icon={User} title="Leaderboards" value={statistics.leaderboardCount} />
      <StatCard icon={Box} title="Tracked Scores" value={statistics.trackedScores} />
      <StatCard icon={Box} title="Score History Scores" value={statistics.scoreHistoryScores} />
      <StatCard icon={Play} title="Stored Replays" value={statistics.storedReplays} />
    </div>
  );
}
