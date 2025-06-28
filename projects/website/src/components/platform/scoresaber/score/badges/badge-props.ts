import { ScoreSaberMedalsScore } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";

export type ScoreBadgeProps = {
  /**
   * The score for this badge
   */
  score: ScoreSaberScore | ScoreSaberMedalsScore;
};
