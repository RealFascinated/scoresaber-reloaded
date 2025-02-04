import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";

/**
 * Converts a database score to a ScoreSaberScore.
 *
 * @param score the score to convert
 * @returns the converted score
 */
export function scoreToObject(score: ScoreSaberScore): ScoreSaberScore {
  return {
    ...removeObjectFields<ScoreSaberScore>(score, ["_id", "__v"]),
    id: score._id,
  } as ScoreSaberScore;
}
