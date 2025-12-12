"use client";

import Card from "@/components/card";
import PlayerScoreHeader from "@/components/score/player-score-header";
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
import ScoreSaberScoreDisplay from "../scoresaber-score";

export function TopScoresData() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

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

  return (
    <Card className="flex h-fit w-full flex-col 2xl:w-[75%]">
      {/* Header Section */}
      <div className="mb-(--spacing-lg)">
        <h1 className="text-2xl font-semibold">Top ScoreSaber Scores</h1>
        <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
          Discover the highest scores tracked across ScoreSaber
        </p>
      </div>

      {isLoading || !scores ? (
        <div className="flex items-center justify-center py-(--spacing-2xl)">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-(--spacing-sm)">
          {/* Scores */}
          {scores.items.map(({ score, leaderboard, beatSaver }) => {
            const player = score.playerInfo;

            return (
              <div key={score.scoreId} className="flex flex-col">
                <PlayerScoreHeader player={player} />

                <div className="bg-card border-border rounded-md rounded-tl-none border px-(--spacing-sm) md:px-0">
                  <ScoreSaberScoreDisplay
                    key={score.scoreId}
                    score={score}
                    leaderboard={leaderboard}
                    beatSaverMap={beatSaver}
                    settings={{
                      // hideLeaderboardDropdown: true,
                      hideAccuracyChanger: true,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Pagination */}
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
