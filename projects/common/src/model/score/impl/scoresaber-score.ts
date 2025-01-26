import { getModelForClass, modelOptions, plugin, ReturnModelType, Severity } from "@typegoose/typegoose";
import { type ScoreSaberLeaderboardPlayerInfoToken } from "../../../types/token/scoresaber/leaderboard-player-info";
import { Document } from "mongoose";
import { AutoIncrementID } from "@typegoose/auto-increment";
import { PreviousScore } from "../previous-score";
import { ScoreSaberScoreBase } from "./scoresaber-score-base";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-scores",
    toObject: {
      virtuals: true,
      transform: function (_, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})
@plugin(AutoIncrementID, {
  field: "_id",
  startAt: 1,
  trackerModelName: "scores",
  trackerCollection: "increments",
  overwriteModelName: "scoresaber-scores",
})
export class ScoreSaberScoreInternal extends ScoreSaberScoreBase {}

class ScoreSaberScorePublic extends ScoreSaberScoreInternal {
  /**
   * The player who set the score.
   */
  public playerInfo!: ScoreSaberLeaderboardPlayerInfoToken;

  /**
   * The amount of pp this score will give
   * if a new one worth the same is set.
   */
  public ppBoundary?: number;
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
