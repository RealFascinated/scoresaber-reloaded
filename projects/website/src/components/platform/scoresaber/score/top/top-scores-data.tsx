"use client";

import Card from "@/components/card";
import { LoadingIcon } from "@/components/loading-icon";
import SimplePagination from "@/components/simple-pagination";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
};
const timeframes: TimeframesType[] = [
  {
    timeframe: "daily",
    display: "Today",
  },
  {
    timeframe: "weekly",
    display: "This Week",
  },
  {
    timeframe: "monthly",
    display: "This Month",
  },
  {
    timeframe: "all",
    display: "All Time",
  },
];

type TopScoresDataProps = {
  timeframe: Timeframe;
};

export function TopScoresData({ timeframe }: TopScoresDataProps) {
  const isMobile = useIsMobile();

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);
  const [page, setPage] = useState(1);

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

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setSelectedTimeframe(newTimeframe);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const memoizedTimeframes = useMemo(() => timeframes, []);

  const renderScore = useCallback(
    ({ score, leaderboard, beatSaver }: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>) => {
      const player = score.playerInfo;
      const name = score.playerInfo ? player.name || player.id : score.playerId;

      return (
        <div key={score.scoreId} className="flex flex-col pt-2">
          <div className="flex items-center gap-2 text-sm bg-accent-deep-foreground/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg w-fit">
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Set by</span>
            <Link prefetch={false} href={`/player/${player.id}`}>
              <span className="text-ssr hover:text-ssr/80 transition-colors font-semibold text-xs sm:text-sm">
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
    <Card className="flex flex-col gap-2 w-full 2xl:w-[75%] justify-center h-fit">
      <div className="flex flex-row flex-wrap gap-2 justify-center">
        {memoizedTimeframes.map(timeframe => (
          <Button
            key={timeframe.timeframe}
            className="w-36 flex items-center gap-2"
            variant={selectedTimeframe === timeframe.timeframe ? "default" : "outline"}
            onClick={() => handleTimeframeChange(timeframe.timeframe)}
          >
            {timeframe.display}
            {(isLoading || isRefetching) && selectedTimeframe === timeframe.timeframe && (
              <LoadingIcon />
            )}
          </Button>
        ))}
      </div>

      <div className="flex justify-center flex-col text-center">
        <p className="font-semibold">Top ScoreSaber Scores</p>
        <p className="text-gray-400">This will only show scores that have been tracked.</p>
      </div>

      {isLoading || !scores ? (
        <div className="flex justify-center items-center">
          <LoadingIcon />
        </div>
      ) : (
        <div className="flex flex-col gap-2 divide-y divide-border">
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
