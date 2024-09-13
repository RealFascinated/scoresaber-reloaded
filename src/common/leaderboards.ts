import ScoreSaberPlayer from "@/common/service/types/scoresaber/scoresaber-player";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/service/score-sort";

export const leaderboards = {
  ScoreSaber: {
    capabilities: {
      search: true,
    },
    queries: {
      lookupScores: (player: ScoreSaberPlayer, sort: ScoreSort, page: number) =>
        scoresaberService.lookupPlayerScores({
          playerId: player.id,
          sort: sort,
          page: page,
        }),
    },
  },
};
