import { useRealm } from "@/components/providers/realm-provider";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { Pagination } from "@ssr/common/pagination";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import useDatabase from "../use-database";

export const useLeaderboardScores = (
  leaderboardId: number,
  historyPlayerId: string,
  page: number,
  mode: ScoreModeEnum,
  country?: string
) => {
  const database = useDatabase();
  const { realmId } = useRealm();
  const friendIds = useStableLiveQuery(() => database.getFriendIds());
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  return useQuery<ScoreSaberScoresPageResponse | undefined>({
    queryKey: [
      "leaderboardScores",
      leaderboardId,
      realmId,
      historyPlayerId,
      page,
      mode,
      country,
      friendIds,
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
        case ScoreModeEnum.Friends: {
          if (friendIds && mainPlayer) {
            const response = await ssrApi.getFriendLeaderboardScores(
              [...friendIds, mainPlayer.id],
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
