"use client";

import PlayerScoreHeader from "@/components/score/player-score-header";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Card from "../../card";
import ScoreSaberScoreDisplay from "../../platform/scoresaber/score/score";
import SimplePagination from "../../simple-pagination";
import { Spinner } from "../../spinner";

export function FriendScores() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const friendIds = useLiveQuery(async () => database.getFriendIds(true));

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
    <Card className="flex h-fit flex-col gap-2">
      <div>
        <p className="font-bold">Friend Scores</p>
        <p className="text-sm text-gray-400">
          The 100 most recent scores from your friends. Score ranks aren&apos;t available as this is
          based on cached data
        </p>
      </div>

      {/* Loading */}
      {isLoading && !scoreData && (
        <div className="flex w-full justify-center py-8">
          <Spinner size="md" className="text-primary" />
        </div>
      )}

      {/* Scores */}
      {scoreData && (
        <div className="flex flex-col gap-2">
          <>
            <div className="flex flex-col gap-2">
              {scoreData.items.map((playerScore, index) => {
                const score = playerScore.score;
                const leaderboard = playerScore.leaderboard;
                const beatSaverMap = playerScore.beatSaver;
                return (
                  <div key={index} className="flex flex-col">
                    <PlayerScoreHeader player={playerScore.score.playerInfo} />
                    <div className="bg-accent-deep rounded-md rounded-tl-none">
                      <ScoreSaberScoreDisplay
                        key={score.scoreId}
                        score={score}
                        leaderboard={leaderboard}
                        beatSaverMap={beatSaverMap}
                        settings={{
                          hideLeaderboardDropdown: true,
                          hideAccuracyChanger: true,
                          // noScoreButtons: true,
                          allowLeaderboardPreview: true,
                        }}
                      />
                    </div>
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
          </>
        </div>
      )}
    </Card>
  );
}
