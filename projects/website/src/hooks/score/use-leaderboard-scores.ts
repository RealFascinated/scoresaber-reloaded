import {
  isSameLeaderboardScoresQuery,
  toLeaderboardScoresPage,
  type LeaderboardScoresInitialData,
} from "@/components/platform/scoresaber/leaderboard/leaderboard-scores-query";
import { useRealm } from "@/components/providers/realm-provider";
import { ScoreModeEnum } from "@/components/score/score-mode";
import { useFollowingIds } from "@/hooks/use-following";
import { useMainPlayer } from "@/hooks/use-main-player";
import { Pagination } from "@ssr/common/pagination";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { ScoreSaberScoresPageResponse } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

export const useLeaderboardScores = (
  leaderboardId: number,
  historyPlayerId: string,
  page: number,
  mode: ScoreModeEnum,
  country?: string,
  initial?: LeaderboardScoresInitialData
) => {
  const { realmId } = useRealm();
  const isDefaultRealm = realmId === DEFAULT_REALM_ID;
  const followingIds = useFollowingIds();
  const mainPlayer = useMainPlayer().data;

  const initialData =
    initial &&
    isDefaultRealm &&
    mode === ScoreModeEnum.Global &&
    isSameLeaderboardScoresQuery(initial.query, { leaderboardId, page, country })
      ? initial.data
      : undefined;

  const modeKey =
    mode === ScoreModeEnum.Following
      ? [followingIds, mainPlayer?.id]
      : mode === ScoreModeEnum.History
        ? [mainPlayer !== undefined]
        : [];

  return useQuery<ScoreSaberScoresPageResponse | undefined>({
    queryKey: ["leaderboardScores", leaderboardId, realmId, historyPlayerId, page, mode, country, ...modeKey],
    queryFn: async () => {
      switch (mode) {
        case ScoreModeEnum.Global: {
          const response = await ssrApi.fetchLeaderboardScores(
            leaderboardId.toString(),
            page,
            country,
            realmId
          );

          return toLeaderboardScoresPage(response);
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
    initialData,
    initialDataUpdatedAt: initial?.fetchedAt,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.options.initialData !== undefined && !isDefaultRealm ? undefined : previous,
  });
};
