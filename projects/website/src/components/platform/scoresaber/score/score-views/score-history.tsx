"use client";

import Card from "@/components/card";
import ScoreSaberScoreDisplay from "@/components/platform/scoresaber/score/score";
import PaginationComponent from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { ClockIcon } from "@heroicons/react/24/outline";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Pagination } from "@ssr/common/pagination";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
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
        return Pagination.empty<{
          score: ScoreSaberScore;
          leaderboard: ScoreSaberLeaderboard;
          beatSaver: BeatSaverMapResponse;
        }>();
      }
      return scoreHistory;
    },
    staleTime: 30 * 1000,
    placeholderData: data => data,
  });

  if (!scores || isError) {
    return (
      <EmptyState
        icon={
          <div className="h-10 w-10">
            <Spinner />
          </div>
        }
        title="Loading Score History"
        description="Please wait while we fetch your score history..."
      />
    );
  }

  if (scores.items.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />}
        title="No Score History"
        description="This score does not have any tracked history"
      />
    );
  }

  return (
    <Card className="flex flex-col gap-2 rounded-xl p-2 md:p-4">
      <div className="divide-border flex flex-col gap-3 divide-y md:gap-2">
        {scores.items.map(({ score, leaderboard, beatSaver }, index) => {
          return (
            <div key={`${score.scoreId}-${index}`} className="py-2 md:py-0">
              <ScoreSaberScoreDisplay
                score={score}
                leaderboard={leaderboard}
                beatSaverMap={beatSaver}
                settings={{
                  hideLeaderboardDropdown: true,
                  hideAccuracyChanger: true,
                  isPreviousScore: true,
                  hideRank: true,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 md:mt-2">
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
    </Card>
  );
}
