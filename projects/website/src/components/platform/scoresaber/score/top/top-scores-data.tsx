"use client";

import Card from "@/components/card";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
import { env } from "@ssr/common/env";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import Request from "@ssr/common/utils/request";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import ScoreSaberScoreDisplay from "../score";

export function TopScoresData() {
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);

  const {
    data: scores,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["top-scores", page],
    queryFn: async () => {
      return Request.get<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>(
        `${env.NEXT_PUBLIC_API_URL}/scores/top/${page}`
      );
    },
    refetchInterval: false,
    placeholderData: data => data,
  });

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const renderScore = useCallback(
    ({ score, leaderboard, beatSaver }: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>) => {
      const player = score.playerInfo;
      const name = score.playerInfo ? player.name || player.id : score.playerId;

      return (
        <div key={`${score.scoreId}`} className="flex flex-col pt-2">
          <div className="bg-muted/50 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Set by</span>
            <SimpleLink href={`/player/${player.id}`}>
              <span className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors sm:text-sm">
                {name}
              </span>
            </SimpleLink>
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
