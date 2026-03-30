import { type ScoreStatsAccuracyTrackerToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/accuracy-tracker";
import { type ScoreStatsHitTrackerToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/hit-tracker";
import { type ScoreStatsGraphTrackerToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/score-graph-tracker";
import { type ScoreStatsWinTrackerToken } from "@ssr/common/schemas/beatleader/tokens/score-stats/win-tracker";
import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

/**
 * The model for score stats.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "beatleader-score-stats",
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
