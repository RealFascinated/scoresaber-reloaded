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
      if (mode === ScoreModeEnum.Global) {
        const response = await ssrApi.fetchLeaderboardScores<
          ScoreSaberScore,
          ScoreSaberLeaderboard
        >(leaderboardId.toString(), page, country);

        if (response) {
          return new Page(response.scores, response.metadata);
        }

        return undefined;
      }

      if (friendIds && mainPlayer) {
        const friendScores = await ssrApi.getFriendLeaderboardScores(
          [...friendIds, mainPlayer.id],
          leaderboardId.toString(),
          page
        );

        if (friendScores) {
          const friends = await database.getFriends();

          friendScores.items = friendScores.items.map(score => ({
            ...score,
            playerInfo: friends.find(f => f.id === score.playerId) || mainPlayer || undefined,
          }));

          return friendScores;
        }
      }

      // If no scores are found, return an empty page
      return Pagination.empty<ScoreSaberScore>();
    },
    placeholderData: data => data,
  });
};
