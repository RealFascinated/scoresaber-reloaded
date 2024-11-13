import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { type ScoreStatsHitTrackerToken } from "@ssr/types/token/beatleader/score-stats/hit-tracker";
import { type ScoreStatsAccuracyTrackerToken } from "@ssr/types/token/beatleader/score-stats/accuracy-tracker";
import { type ScoreStatsWinTrackerToken } from "@ssr/types/token/beatleader/score-stats/win-tracker";
import { type ScoreStatsGraphTrackerToken } from "@ssr/types/token/beatleader/score-stats/score-graph-tracker";

/**
 * The model for score stats.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "beatleader-score-stats",
    toObject: {
      virtuals: true,
      transform: function (_, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})
export class ScoreStats {
  /**
   * The id of the score.
   */
  @prop({ required: true })
  public _id!: number;

  /**
   * The hit tracker stats.
   */
  @prop({ required: true })
  hitTracker!: ScoreStatsHitTrackerToken;

  /**
   * The accuracy tracker stats.
   */
  @prop({ required: true })
  accuracyTracker!: ScoreStatsAccuracyTrackerToken;

  /**
   * The win tracker stats.
   */
  @prop({ required: true })
  winTracker!: ScoreStatsWinTrackerToken;

  /**
   * The score graph tracker stats.
   */
  @prop({ required: true })
  scoreGraphTracker!: ScoreStatsGraphTrackerToken;
}

export type ScoreStatsDocument = ScoreStats & Document;
export const ScoreStatsModel: ReturnModelType<typeof ScoreStats> = getModelForClass(ScoreStats);
