import ScoreSaberPlayer from "@/common/data-fetcher/types/scoresaber/scoresaber-player";
import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import { ScoreSort } from "@/common/data-fetcher/sort";

export const leaderboards = {
  ScoreSaber: {
    capabilities: {
      search: true,
    },
    queries: {
      lookupScores: (player: ScoreSaberPlayer, sort: ScoreSort, page: number) =>
        scoresaberFetcher.lookupPlayerScores({
          playerId: player.id,
          sort: sort,
          page: page,
        }),
    },
  },
};
