import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { Medal } from "lucide-react";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
  comparisonPlayerId?: string;
};

export class MedalScoresPlatform extends Platform {
  constructor() {
    super(PlatformType.MedalScores, "Medals", {
      logo: <Medal className="h-4.5 w-4.5" />,
      displayPredicate: async () => {
        return true;
      },
    });
  }
}
