import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import ScoresaberLogo from "../../../components/logos/logos/scoresaber-logo";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type ScoreSaberScoreLookupOptions = {
  sort: ScoreSaberScoreSort;
  search?: string;
};

export class SSRPlatform extends Platform {
  constructor() {
    super(PlatformType.SSR, "SSR", {
      logo: <ScoresaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async () => {
        return true;
      },
    });
  }
}
