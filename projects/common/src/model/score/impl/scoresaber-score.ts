import { getModelForClass, modelOptions, plugin, Prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import Score from "../score";
import { type ScoreSaberLeaderboardPlayerInfoToken } from "../../../types/token/scoresaber/leaderboard-player-info";
import { Document } from "mongoose";
import { AutoIncrementID } from "@typegoose/auto-increment";
import { PreviousScore } from "../previous-score";
import { type Controllers } from "../controllers";

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
export class ScoreSaberScoreInternal extends Score {
  /**
   * The score's id.
   */
  @Prop({ required: true })
  public readonly scoreId!: string;

  /**
   * The leaderboard the score was set on.
   */
  @Prop({ required: true, index: true })
  public readonly leaderboardId!: number;

  /**
   * The amount of pp for the score.
   * @private
   */
  @Prop({ required: true })
  public pp!: number;

  /**
   * The weight of the score, or undefined if not ranked.
   * @private
   */
  @Prop()
  public weight?: number;

  /**
   * The max combo of the score.
   */
  @Prop({ required: true })
  public readonly maxCombo!: number;

  /**
   * The hmd used to set the score.
   */
  @Prop({ required: false })
  public readonly hmd?: string;

  /**
   * The hmd used to set the score.
   */
  @Prop({ required: false })
  public readonly controllers?: Controllers;

  /**
   * The previous score, if any.
   */
  public previousScore?: ScoreSaberPreviousScore;
}

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

export type ScoreSaberPreviousScore = PreviousScore & {
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
  change?: ScoreSaberPreviousScore;
};

export type ScoreSaberScore = InstanceType<typeof ScoreSaberScorePublic>;
export type ScoreSaberScoreDocument = ScoreSaberScore & Document;
export const ScoreSaberScoreModel: ReturnModelType<typeof ScoreSaberScoreInternal> =
  getModelForClass(ScoreSaberScoreInternal);
