import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";
import ScoreSaberPlayerScores from "@/components/player/platform/scoresaber/player-scores";
import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ReactNode } from "react";
import { Platform, PlatformRenderProps } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
};

export class ScoreSaberPlatform extends Platform<
  ScoreSaberPlayer,
  PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>,
  ScoreSaberLeaderboard,
  ScoreSaberScoreLookupOptions
> {
  constructor() {
    super(PlatformType.ScoreSaber, "ScoreSaber", {
      logo: <ScoresaberLogo className="w-4.5 h-4.5" />,
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
  ): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const response = await ssrApi.fetchScoreSaberPlayerScores(
      playerId,
      page,
      options.sort,
      options.search
    );
    if (!response) {
      return Pagination.empty();
    }
    return response;
  }

  render(props: PlatformRenderProps<ScoreSaberPlayer, ScoreSaberScoreLookupOptions>): ReactNode {
    return ScoreSaberPlayerScores({
      player: props.player,
      sort: props.sort.sort,
      page: props.page,
      initialSearch: props.initialSearch,
    });
  }
}
