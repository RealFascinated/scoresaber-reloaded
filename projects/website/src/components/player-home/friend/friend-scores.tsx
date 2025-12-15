"use client";

import PlayerScoreHeader from "@/components/score/player-score-header";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Card from "../../card";
import ScoreSaberScoreDisplay from "../../platform/scoresaber/score/scoresaber-score";
import SimplePagination from "../../simple-pagination";
import { Spinner } from "../../spinner";

export function FriendScores() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const friendIds = useStableLiveQuery(async () => database.getFriendIds(true));

  const [page, setPage] = useState(1);

  const {
    data: scoreData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["friend-scores", friendIds, page],
    queryFn: async () => ssrApi.getFriendScores(friendIds!, page),
    enabled: friendIds !== undefined && friendIds.length > 0,
    placeholderData: prev => prev,
  });

  return (
    <Card className="flex h-fit flex-col">
      <div className="mb-(--spacing-lg)">
        <h2 className="text-lg font-semibold">Friend Scores</h2>
        <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
          The 100 most recent scores from your friends. Score ranks aren&apos;t available as this is based on cached
          data
        </p>
      </div>

      {/* Loading */}
      {isLoading && !scoreData && (
        <div className="flex w-full justify-center py-(--spacing-2xl)">
          <Spinner size="md" className="text-primary" />
        </div>
      )}

      {/* Scores */}
      {scoreData && (
        <div className="flex flex-col gap-(--spacing-lg)">
          <div className="flex flex-col gap-(--spacing-lg)">
            {scoreData.items.map((playerScore, index) => {
              const score = playerScore.score;
              const leaderboard = playerScore.leaderboard;
              const beatSaverMap = playerScore.beatSaver;
              return (
                <div key={index} className="flex flex-col">
                  <PlayerScoreHeader player={playerScore.score.playerInfo} />
                  <Card className="rounded-lg rounded-tl-none p-0">
                    <ScoreSaberScoreDisplay
                      key={score.scoreId}
                      score={score}
                      leaderboard={leaderboard}
                      beatSaverMap={beatSaverMap}
                      settings={{
                        hideAccuracyChanger: true,
                      }}
                    />
                  </Card>
                </div>
              );
            })}
          </div>

          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={scoreData.metadata.totalItems}
            itemsPerPage={scoreData.metadata.itemsPerPage}
            loadingPage={isLoading || isFetching ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
