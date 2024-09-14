import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/service/score-sort";

export const leaderboards = {
  ScoreSaber: {
    capabilities: {
      search: true,
    },
    queries: {
      lookupScores: (
        player: ScoreSaberPlayerToken,
        sort: ScoreSort,
        page: number,
      ) =>
        scoresaberService.lookupPlayerScores({
          playerId: player.id,
          sort: sort,
          page: page,
        }),
    },
  },
};
