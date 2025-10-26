import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
  comparisonPlayerId?: string;
};

export class ScoreSaberPlatform extends Platform {
  constructor() {
    super(PlatformType.ScoreSaber, "ScoreSaber", {
      logo: <ScoresaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async () => {
        return true;
      },
    });
  }
}
