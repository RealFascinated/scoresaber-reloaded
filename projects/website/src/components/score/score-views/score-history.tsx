"use client";

import { LoadingIcon } from "@/components/loading-icon";
import Score from "@/components/score/score";
import PaginationComponent from "@/components/simple-pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Pagination } from "@ssr/common/pagination";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type ScoreHistoryProps = {
  /**
   * The player who set this score.
   */
  playerId: string;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreHistory({ playerId, leaderboard }: ScoreHistoryProps) {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

  const {
    data: scores,
    isError,
    isLoading,
  } = useQuery({
    queryKey: [`scoresHistory:${leaderboard.id}`, leaderboard.id, page],
    queryFn: async () => {
      const scoreHistory = await ssrApi.fetchPlayerScoresHistory(
        playerId,
        leaderboard.id + "",
        page
      );
      if (scoreHistory == undefined) {
        return Pagination.empty();
      }
      return scoreHistory;
    },
    staleTime: 30 * 1000,
    placeholderData: data => data,
  });

  if (!scores || isError) {
    return (
      <div className="flex justify-center">
        <LoadingIcon />
      </div>
    );
  }

  if (scores.items.length === 0) {
    return (
      <div className="flex justify-center">
        <p>This score does not have any tracked history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col divide-y divide-border">
        {scores.items.map(({ score, leaderboard, beatSaver }, index) => {
          return (
            <Score
              key={score.scoreId}
              score={score}
              leaderboard={leaderboard}
              beatSaverMap={beatSaver}
              settings={{
                hideLeaderboardDropdown: true,
                hideAccuracyChanger: true,
              }}
            />
          );
        })}
      </div>

      <PaginationComponent
        mobilePagination={isMobile}
        page={page}
        totalItems={scores.metadata.totalItems}
        itemsPerPage={scores.metadata.itemsPerPage}
        loadingPage={isLoading ? page : undefined}
        onPageChange={newPage => {
          setPage(newPage);
        }}
      />
    </div>
  );
}
