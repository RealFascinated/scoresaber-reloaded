import { ScoreModeEnum } from "@/components/score/score-mode";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import useDatabase from "../use-database";

export const useLeaderboardScores = (
  leaderboardId: number,
  page: number,
  mode: ScoreModeEnum,
  country?: string
) => {
  const database = useDatabase();
  const friendIds = useLiveQuery(() => database.getFriendIds());
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  return useQuery<Page<ScoreSaberScore> | undefined>({
    queryKey: ["leaderboardScores", leaderboardId, page, mode, country, friendIds, mainPlayer],
    queryFn: async () => {
      switch (mode) {
        case ScoreModeEnum.Global: {
          const response = await ssrApi.fetchLeaderboardScores<
            ScoreSaberScore,
            ScoreSaberLeaderboard
          >(leaderboardId.toString(), page, country);

          if (response) {
            return new Page(response.scores, response.metadata);
          }

          return Pagination.empty();
        }
        case ScoreModeEnum.Friends: {
          if (friendIds && mainPlayer) {
            const response = await ssrApi.getFriendLeaderboardScores(
              [...friendIds, mainPlayer.id],
              leaderboardId.toString(),
              page
            );

            if (response) {
              const friends = await database.getFriends();

              response.items = response.items.map(score => ({
                ...score,
                playerInfo: friends.find(f => f.id === score.playerId) || mainPlayer || undefined,
              }));

              return response;
            }
          }

          return Pagination.empty();
        }
        case ScoreModeEnum.History: {
          if (mainPlayer) {
            const response = await ssrApi.fetchPlayerScoresHistory(
              mainPlayer.id,
              leaderboardId.toString(),
              page
            );

            if (response) {
              return response;
            }
          }

          return Pagination.empty();
        }
      }
    },
    placeholderData: data => data,
  });
};
