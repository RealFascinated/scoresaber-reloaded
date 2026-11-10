import { useRealm } from "@/components/providers/realm-provider";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { useFollowingIds } from "@/hooks/use-following";
import { useMainPlayer } from "@/hooks/use-main-player";
import { Pagination } from "@ssr/common/pagination";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

export const useLeaderboardScores = (
  leaderboardId: number,
  historyPlayerId: string,
  page: number,
  mode: ScoreModeEnum,
  country?: string
) => {
  const { realmId } = useRealm();
  const followingIds = useFollowingIds();
  const mainPlayer = useMainPlayer().data;

  return useQuery<ScoreSaberScoresPageResponse | undefined>({
    queryKey: [
      "leaderboardScores",
      leaderboardId,
      realmId,
      historyPlayerId,
      page,
      mode,
      country,
      followingIds,
      mainPlayer,
    ],
    queryFn: async () => {
      switch (mode) {
        case ScoreModeEnum.Global: {
          const response = await ssrApi.fetchLeaderboardScores(
            leaderboardId.toString(),
            page,
            country,
            realmId
          );

          if (response) {
            return {
              items: response.scores,
              metadata: response.metadata,
            };
          }

          return Pagination.empty();
        }
        case ScoreModeEnum.Following: {
          if (followingIds && mainPlayer) {
            const response = await ssrApi.getFollowingLeaderboardScores(
              [...followingIds, mainPlayer.id],
              leaderboardId.toString(),
              page,
              realmId
            );

            if (response) {
              return response;
            }
          }

          return Pagination.empty<ScoreSaberScore>();
        }
        case ScoreModeEnum.History: {
          if (mainPlayer) {
            const response = await ssrApi.fetchPlayerScoreSaberScoresHistory(
              historyPlayerId,
              leaderboardId.toString(),
              page,
              realmId
            );

            if (response) {
              return response;
            }
          }

          return Pagination.empty<ScoreSaberScore>();
        }
      }
    },
    placeholderData: data => data,
  });
};
