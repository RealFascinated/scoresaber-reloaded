"use client";

import { isEqual } from "@/common/utils";
import Pagination from "@/components/input/pagination";
import Score from "@/components/score/score";
import { useIsMobile } from "@/hooks/use-is-mobile";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
  const [scores, setScores] = useState<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>();

  const { data, isError, isLoading } = useQuery({
    queryKey: [`scoresHistory:${leaderboard.id}`, leaderboard.id, page],
    queryFn: async () => ssrApi.fetchPlayerScoresHistory(playerId, leaderboard.id + "", page),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (data && !isEqual(data, scores)) {
      setScores(data);
    }
  }, [data]);

  if (!scores || isError) {
    return <p className="text-center">No score history found.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col divide-y divide-border">
        {scores.items.map(({ score, leaderboard, beatSaver }, index) => {
          return (
            <Score
              key={index}
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
