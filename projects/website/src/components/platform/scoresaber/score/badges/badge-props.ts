import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";

export type ScoreBadgeProps = {
  /**
   * The score for this badge
   */
  score: ScoreSaberScore | ScoreSaberMedalScore;
};
