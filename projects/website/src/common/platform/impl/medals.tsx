import { SharedIcons } from "@/shared-icons";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
};

export class MedalScoresPlatform extends Platform {
  constructor() {
    super(PlatformType.MedalScores, "Medals", {
      logo: <SharedIcons.MedalsPlatformLogoIcon className="h-4.5 w-4.5" />,
      displayPredicate: async (player: ScoreSaberPlayer) => player.medals > 0,
    });
  }
}
