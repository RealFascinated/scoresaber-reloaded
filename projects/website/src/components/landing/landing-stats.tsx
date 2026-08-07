"use client";

import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { SharedIcons, type SharedDecorativeIcon } from "@/shared-icons";
import { AppStatisticsResponse } from "@ssr/common/schemas/response/ssr/app-statistics";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type LandingStat = {
  label: string;
  icon: SharedDecorativeIcon;
  key: keyof AppStatisticsResponse;
};

type StatKey = keyof AppStatisticsResponse;

type StatBump = {
  id: number;
  amount: number;
};

const STATS: LandingStat[] = [
  { label: "Active Players", icon: SharedIcons.FriendSystemFeatureIcon, key: "activePlayers" },
  { label: "Leaderboards", icon: SharedIcons.ViewLeaderboardIcon, key: "leaderboardCount" },
  { label: "Tracked Scores", icon: SharedIcons.AdvancedAnalyticsFeatureIcon, key: "trackedScores" },
  { label: "Score History", icon: SharedIcons.PlayerHistorySettingsIcon, key: "scoreHistoryScores" },
  { label: "Stored Replays", icon: SharedIcons.WatchReplayIcon, key: "storedReplays" },
  { label: "Unique Players Today", icon: SharedIcons.ScoreDateIcon, key: "uniquePlayersToday" },
];

function LandingStatCard({
  label,
  icon: Icon,
  value,
  bump,
  onBumpComplete,
}: {
  label: string;
  icon: SharedDecorativeIcon;
  value: number;
  bump?: StatBump;
  onBumpComplete: () => void;
}) {
  return (
    <div className="ring-border bg-card flex flex-col items-center gap-1 rounded-xl p-5 text-center ring-1">
      <Icon className="text-muted-foreground mb-1 h-5 w-5" />
      <div className="flex items-center gap-1">
        <CountUp value={value} className="text-foreground text-xl font-bold" />
        {bump && (
          <m.span
            key={bump.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -16, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onAnimationComplete={onBumpComplete}
            className="text-primary text-sm font-bold select-none"
          >
            +{bump.amount}
          </m.span>
        )}
      </div>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

/**
 * Live stats for the landing page, fetched from the backend `/statistics` endpoint.
 * Values tick upward client-side at the reported velocity until the next fetch,
 * with a floating "+N" animation whenever a displayed value increments.
 */
export function LandingStats() {
  const { data, dataUpdatedAt, isLoading } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: () => ssrApi.getAppStatistics(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const shouldReduceMotion = useReducedMotion();

  // Live values extrapolated from the last fetch, refreshed every second
  const [liveValues, setLiveValues] = useState<Partial<Record<StatKey, number>>>({});

  // Active "+N" bump per statistic, removed once its animation completes
  const [bumps, setBumps] = useState<Partial<Record<StatKey, StatBump>>>({});
  const prevRoundedRef = useRef<Partial<Record<StatKey, number>>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    // Baseline for increment detection resets when fresh data arrives
    prevRoundedRef.current = Object.fromEntries(STATS.map(({ key }) => [key, Math.round(data[key].value)]));

    const interval = setInterval(() => {
      const elapsed = (Date.now() - dataUpdatedAt) / 1000;
      const values = {} as Partial<Record<StatKey, number>>;
      const newBumps = {} as Partial<Record<StatKey, StatBump>>;
      for (const { key } of STATS) {
        const value = data[key].value + data[key].velocity * elapsed;
        values[key] = value;

        const rounded = Math.round(value);
        const previous = prevRoundedRef.current[key];
        if (!shouldReduceMotion && previous !== undefined && rounded > previous) {
          newBumps[key] = { id: Date.now(), amount: rounded - previous };
        }
        prevRoundedRef.current[key] = rounded;
      }
      setLiveValues(values);
      setBumps(previousBumps => ({ ...previousBumps, ...newBumps }));
    }, 1000);

    return () => clearInterval(interval);
  }, [data, dataUpdatedAt, shouldReduceMotion]);

  const removeBump = (key: StatKey) => {
    setBumps(previousBumps => {
      const next = { ...previousBumps };
      delete next[key];
      return next;
    });
  };

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
      {STATS.map(({ label, icon, key }) => (
        <LandingStatCard
          key={label}
          label={label}
          icon={icon}
          value={liveValues[key] ?? data[key].value}
          bump={bumps[key]}
          onBumpComplete={() => removeBump(key)}
        />
      ))}
    </div>
  );
}
