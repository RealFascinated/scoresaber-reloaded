"use client";

import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Score from "@/components/score/score";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Pagination from "@/components/input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { randomString } from "@ssr/common/utils/string.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";

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

  const { data, isError, isLoading } = useQuery({
    queryKey: [`scoresHistory:${leaderboard.id}`, leaderboard.id, page],
    queryFn: async () => ssrApi.fetchPlayerScoresHistory(playerId, leaderboard.id + "", page),
    staleTime: 30 * 1000,
  });

  if (!data || isError) {
    return <p className="text-center">No score history found.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col divide-y divide-border">
        {data.items.map(({ score, leaderboard, beatSaver }) => {
          return (
            <Score
              key={score.scoreId + randomString(2)}
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

      <Pagination
        mobilePagination={isMobile}
        page={page}
        totalItems={data.metadata.totalItems}
        itemsPerPage={data.metadata.itemsPerPage}
        loadingPage={isLoading ? page : undefined}
        onPageChange={newPage => {
          setPage(newPage);
        }}
      />
    </div>
  );
}
