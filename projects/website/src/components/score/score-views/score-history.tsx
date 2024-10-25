"use client";

import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import Score from "@/components/score/score";
import { fetchPlayerScoresHistory } from "@ssr/common/utils/score-utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Pagination from "@/components/input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
    queryFn: async () => fetchPlayerScoresHistory(playerId, leaderboard.id + "", page),
    staleTime: 30 * 1000,
  });

  if (!data || isError) {
    return <p className="text-center">No score history found.</p>;
  }

  return (
    <>
      {data.items.map(({ score, leaderboard, beatSaver }) => (
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
      ))}

      <Pagination
        mobilePagination={isMobile}
        page={page}
        totalPages={data.metadata.totalPages}
        loadingPage={isLoading ? page : undefined}
        onPageChange={newPage => {
          setPage(newPage);
        }}
      />
    </>
  );
}
