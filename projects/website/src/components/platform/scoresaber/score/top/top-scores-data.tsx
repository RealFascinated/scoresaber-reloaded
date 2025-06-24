"use client";

import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CalendarDaysIcon, CalendarIcon, ClockIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { env } from "@ssr/common/env";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Timeframe } from "@ssr/common/timeframe";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ScoreSaberScoreDisplay from "../score";

type TimeframesType = {
  timeframe: Timeframe;
  display: string;
  icon: React.ElementType;
};
const timeframes: TimeframesType[] = [
  {
    timeframe: "daily",
    display: "Today",
    icon: CalendarDaysIcon,
  },
  {
    timeframe: "weekly",
    display: "This Week",
    icon: ClockIcon,
  },
  {
    timeframe: "monthly",
    display: "This Month",
    icon: CalendarIcon,
  },
  {
    timeframe: "all",
    display: "All Time",
    icon: TrophyIcon,
  },
];

type TopScoresDataProps = {
  timeframe: Timeframe;
};

export function TopScoresData({ timeframe }: TopScoresDataProps) {
  const isMobile = useIsMobile();

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);
  const [page, setPage] = useState(1);
  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);

  const {
    data: scores,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["top-scores", selectedTimeframe, page],
    queryFn: async () => {
      return Request.get<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
        `${env.NEXT_PUBLIC_API_URL}/scores/top/${selectedTimeframe}/${page}`
      );
    },
    refetchInterval: false,
    placeholderData: data => data,
  });

  useEffect(() => {
    window.history.replaceState(null, "", `/scores/top/${selectedTimeframe}`);
  }, [selectedTimeframe]);

  const handleTimeframeChange = useCallback(
    (newTimeframe: Timeframe) => {
      if (newTimeframe !== selectedTimeframe) {
        setIsChangingTimeframe(true);
        setSelectedTimeframe(newTimeframe);
        setPage(1); // Reset to first page when changing timeframe
      }
    },
    [selectedTimeframe]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Reset the changing timeframe flag when data loads or when timeframe changes
  useEffect(() => {
    if (!isLoading && !isRefetching) {
      setIsChangingTimeframe(false);
    }
  }, [isLoading, isRefetching, selectedTimeframe]);

  const memoizedTimeframes = useMemo(() => timeframes, []);

  const renderScore = useCallback(
    ({ score, leaderboard, beatSaver }: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>) => {
      const player = score.playerInfo;
      const name = score.playerInfo ? player.name || player.id : score.playerId;

      return (
        <div key={`${score.scoreId}`} className="flex flex-col pt-2">
          <div className="bg-muted/50 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Set by</span>
            <Link href={`/player/${player.id}`}>
              <span className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors sm:text-sm">
                {name}
              </span>
            </Link>
          </div>
          <ScoreSaberScoreDisplay
            score={score}
            leaderboard={leaderboard}
            beatSaverMap={beatSaver}
            settings={{
              hideAccuracyChanger: true,
              hideRank: true,
              allowLeaderboardPreview: true,
            }}
          />
        </div>
      );
    },
    []
  );

  return (
    <Card className="flex h-fit w-full flex-col justify-center gap-6 2xl:w-[75%]">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Top ScoreSaber Scores</h1>
          <p className="text-muted-foreground text-sm">
            Discover the highest scores tracked across ScoreSaber
          </p>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row flex-wrap justify-center gap-3">
          {memoizedTimeframes.map(timeframe => (
            <Button
              key={timeframe.timeframe}
              className="relative min-w-[120px] transition-all duration-200"
              variant={selectedTimeframe === timeframe.timeframe ? "default" : "outline"}
              onClick={() => handleTimeframeChange(timeframe.timeframe)}
            >
              <span className="flex items-center gap-1.5">
                {isChangingTimeframe && selectedTimeframe === timeframe.timeframe ? (
                  <Spinner className="text-foreground h-3 w-3" />
                ) : (
                  <timeframe.icon className="h-4 w-4" />
                )}
                {timeframe.display}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading || !scores ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="divide-border flex flex-col gap-2 divide-y">
          {scores.items.map(renderScore)}
          <SimplePagination
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={handlePageChange}
            mobilePagination={isMobile}
          />
        </div>
      )}
    </Card>
  );
}
