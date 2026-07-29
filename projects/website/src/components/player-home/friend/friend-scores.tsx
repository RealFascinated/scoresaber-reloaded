"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ScoreSaberScoreDisplay from "../../platform/scoresaber/score/scoresaber-score";
import SimplePagination from "../../simple-pagination";
import { Spinner } from "../../spinner";

export function FriendScores() {
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const friendIds = useStableLiveQuery(async () => database.getFriendIds(true));

  const [page, setPage] = useState(1);

  const {
    data: scoreData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["friend-scores", friendIds, page, mainPlayerId],
    queryFn: async () =>
      ssrApi.fetchPlayerScoreSaberScores(mainPlayerId!, page, "date", "desc", {
        playerIds: friendIds,
      }),
    enabled: friendIds !== undefined && friendIds.length > 0 && mainPlayerId !== undefined,
    placeholderData: prev => prev,
  });

  return (
    <div className="ring-border bg-card rounded-xl p-5 ring-1">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Friend Scores</h2>
        <p className="text-muted-foreground mt-1 text-sm">See the recent scores of your friends.</p>
      </div>

      {isLoading && !scoreData && (
        <div className="flex w-full justify-center py-12">
          <Spinner size="md" className="text-primary" />
        </div>
      )}

      {scoreData && (
        <div className="flex flex-col gap-4">
          {scoreData.items.map(playerScore => {
            const score = playerScore.score;
            const leaderboard = playerScore.leaderboard;
            const beatSaverMap = playerScore.beatSaver;
            const player = score.playerInfo;
            if (!player) {
              return null;
            }

            return (
              <div key={score.scoreId} className="ring-border bg-card overflow-hidden rounded-xl ring-1">
                <div className="border-border/50 flex items-center gap-2 border-b px-4 py-2">
                  <Avatar
                    src={player.avatar}
                    alt={`${player.name}'s Profile Picture`}
                    size={20}
                    className="shrink-0"
                  />
                  <SimpleLink
                    href={`/player/${player.id}`}
                    className="hover:text-primary text-sm font-medium transition-colors"
                  >
                    {player.name}
                  </SimpleLink>
                </div>
                <ScoreSaberScoreDisplay
                  key={score.scoreId}
                  score={score}
                  leaderboard={leaderboard}
                  beatSaverMap={beatSaverMap}
                  settings={{
                    hideAccuracyChanger: true,
                  }}
                />
              </div>
            );
          })}

          <SimplePagination
            page={page}
            totalItems={scoreData.metadata.totalItems}
            itemsPerPage={scoreData.metadata.itemsPerPage}
            loadingPage={isLoading || isFetching ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
          />
        </div>
      )}
    </div>
  );
}
