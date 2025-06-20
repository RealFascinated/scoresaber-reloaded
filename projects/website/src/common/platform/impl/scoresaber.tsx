import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";
import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
  comparisonPlayerId?: string;
};

export class ScoreSaberPlatform extends Platform<
  ScoreSaberPlayer,
  PlayerScoresResponse,
  ScoreSaberLeaderboard,
  ScoreSaberScoreLookupOptions,
  ScoreSaberScoreSort
> {
  constructor() {
    super(PlatformType.ScoreSaber, "ScoreSaber", "recent", {
      logo: <ScoresaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async (playerId: string) => {
        return true;
      },
    });
  }

  getPlayer(id: string): Promise<ScoreSaberPlayer | undefined> {
    return ssrApi.getScoreSaberPlayer(id, {
      createIfMissing: true,
      type: DetailType.FULL,
    });
  }

  async getPlayerScores(
    playerId: string,
    page: number,
    options: ScoreSaberScoreLookupOptions
  ): Promise<PlayerScoresResponse> {
    const response = await ssrApi.fetchScoreSaberPlayerScores(
      playerId,
      page,
      options.sort,
      options.search,
      options.comparisonPlayerId
    );
    if (!response) {
      return Pagination.empty();
    }
    return response;
  }
}
