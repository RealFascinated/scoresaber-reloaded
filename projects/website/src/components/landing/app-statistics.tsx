"use client";

import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { History, LucideIcon, Target, Trophy, User, UserX, Video } from "lucide-react";
import CountUp from "react-countup";
import Card from "../card";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
}

function StatCard({ icon: Icon, title, value }: StatCardProps) {
  return (
    <Card>
      <div className="relative">
        <div className="bg-primary/10 text-primary mb-3 inline-flex rounded-lg p-2">
          <Icon className="size-5" />
        </div>
        <h3 className="text-muted-foreground mb-1 text-sm font-semibold">{title}</h3>
        <p className="text-2xl font-bold">
          <CountUp end={value} duration={1.2} enableScrollSpy scrollSpyOnce preserveValue={true} />
        </p>
      </div>
    </Card>
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
      <StatCard icon={Trophy} title="Leaderboards" value={statistics.leaderboardCount} />
      <StatCard icon={Target} title="Tracked Scores" value={statistics.trackedScores} />
      <StatCard icon={History} title="Score History Scores" value={statistics.scoreHistoryScores} />
      <StatCard icon={Video} title="Stored Replays" value={statistics.storedReplays} />
    </div>
  );
}
