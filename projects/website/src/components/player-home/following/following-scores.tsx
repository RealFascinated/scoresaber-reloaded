"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import Avatar from "@/components/avatar";
import { useRealm } from "@/components/providers/realm-provider";
import SimpleLink from "@/components/simple-link";
import { useFollowingIds } from "@/hooks/use-following";
import { useMainPlayerId } from "@/hooks/use-main-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ScoreSaberScoreDisplay from "../../platform/scoresaber/score/scoresaber-score";
import SimplePagination from "../../simple-pagination";
import { Spinner } from "../../spinner";
import { followingScoresQueryKey } from "../home-queries";

export function FollowingScores() {
  const { realmId } = useRealm();
  const mainPlayerId = useMainPlayerId();
  const followingIds = useFollowingIds(true);

  const [page, setPage] = useState(1);

  const {
    data: scoreData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: followingScoresQueryKey(followingIds, page, mainPlayerId, realmId),
    queryFn: async () =>
      ssrApi.fetchPlayerScoreSaberScores(mainPlayerId!, page, "date", "desc", {
        playerIds: followingIds,
        realmId,
      }),
    retry: false,
    enabled: followingIds !== undefined && followingIds.length > 0 && mainPlayerId !== undefined,
    placeholderData: prev => prev,
  });

  const showBackendUnavailable = !scoreData && isError && isBackendUnavailableError(error);

  if (showBackendUnavailable) {
    return <BackendUnavailable onRetry={() => refetch()} />;
  }

  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-border">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Following Scores</h2>
        <p className="mt-1 text-sm text-muted-foreground">See the recent scores of the players you follow.</p>
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
              <div key={score.scoreId} className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                  <Avatar
                    src={player.avatar}
                    alt={`${player.name}'s Profile Picture`}
                    size={20}
                    className="shrink-0"
                  />
                  <SimpleLink
                    href={`/player/${player.id}`}
                    className="text-sm font-medium transition-colors hover:text-primary"
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
