import { ScoreModeEnum } from "@/components/score/score-mode";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import { Metadata } from "@ssr/common/types/metadata";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import useDatabase from "../use-database";

const createPage = (items: ScoreSaberScore[], metadata: Metadata): Page<ScoreSaberScore> => ({
  items,
  metadata,
  toJSON: () => ({ items, metadata }),
});

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
        const leaderboard = await ssrApi.fetchLeaderboardScores<
          ScoreSaberScore,
          ScoreSaberLeaderboard
        >(leaderboardId.toString(), page, country);
        return createPage(leaderboard!.scores, leaderboard!.metadata);
      }

      if (friendIds && mainPlayer) {
        const friendScores = await ssrApi.getFriendLeaderboardScores(
          [...friendIds, mainPlayer.id],
          leaderboardId.toString(),
          page
        );

        if (friendScores) {
          const friends = await database.getFriends();
          return createPage(
            friendScores.items.map(score => ({
              ...score,
              rank: -1,
              playerInfo: friends.find(f => f.id === score.playerId) || mainPlayer || undefined,
            })),
            friendScores.metadata
          );
        }
      }

      // If no scores are found, return an empty page
      return Pagination.empty<ScoreSaberScore>();
    },
    placeholderData: data => data,
  });
};
