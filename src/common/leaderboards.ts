import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/service/score-sort";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";

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

      lookupGlobalPlayers: (page: number) =>
        scoresaberService.lookupPlayers(page),
      lookupGlobalPlayersByCountry: (page: number, country: string) =>
        scoresaberService.lookupPlayersByCountry(page, country),
    },
  },
};
