import { AutoIncrementID } from "@typegoose/auto-increment";
import {
  getModelForClass,
  index,
  modelOptions,
  plugin,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";
import { ScoreSaberLeaderboardPlayerInfoToken } from "../../../types/token/scoresaber/leaderboard-player-info";
import { PreviousScore } from "../previous-score";
import { ScoreSaberScoreBase } from "./scoresaber-score-base";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-scores",
  },
})
@plugin(AutoIncrementID, {
  field: "_id",
  startAt: 1,
  trackerModelName: "scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-scores",
})
@index({ playerId: 1, leaderboardId: 1, score: 1 })
@index({ playerId: 1, pp: -1 })
@index({ leaderboardId: 1, rank: 1 })
@index({ timestamp: -1, playerId: 1 }) // For time-based aggregations
@index({ leaderboardId: 1, timestamp: -1 }) // For leaderboard play counts
export class ScoreSaberScoreInternal extends ScoreSaberScoreBase {}

export class ScoreSaberScorePublic extends ScoreSaberScoreInternal {
  /**
   * The player who set the score.
   */
  public playerInfo!: ScoreSaberLeaderboardPlayerInfoToken;

  /**
   * The score of the player who set the score.
   */
  public comparisonScore?: ScoreSaberScore;
}

export type ScoreSaberPreviousScoreOverview = PreviousScore & {
  /**
   * The pp of the previous score.
   */
  pp: number;

  /**
   * The weight of the previous score.
   */
  weight: number;

  /**
   * The max combo of the previous score.
   */
  maxCombo: number;

  /**
   * The change between the previous score and the current score.
   */
  change?: ScoreSaberPreviousScoreOverview;
};

export type ScoreSaberScore = InstanceType<typeof ScoreSaberScorePublic>;
export type ScoreSaberScoreDocument = ScoreSaberScore & Document;
export const ScoreSaberScoreModel: ReturnModelType<typeof ScoreSaberScoreInternal> =
  getModelForClass(ScoreSaberScoreInternal);
