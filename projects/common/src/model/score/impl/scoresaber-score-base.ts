import { modelOptions, Prop, Severity } from "@typegoose/typegoose";
import type { HMD } from "../../../hmds";
import { BeatLeaderScore } from "../../beatleader-score/beatleader-score";
import { type Controllers } from "../controllers";
import Score from "../score";
import { ScoreSaberPreviousScoreOverview } from "./scoresaber-score";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
})
export class ScoreSaberScoreBase extends Score {
  /**
   * The score's id.
   */
  @Prop({ required: true })
  public readonly scoreId!: string;

  /**
   * The leaderboard the score was set on.
   */
  @Prop({ required: true })
  public readonly leaderboardId!: number;

  /**
   * The amount of pp for the score.
   */
  @Prop({ required: true })
  public pp!: number;

  /**
   * The weight of the score, or undefined if not ranked.
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
  public hmd?: HMD;

  /**
   * The hmd used to set the score.
   */
  @Prop({ required: false })
  public readonly controllers?: Controllers;

  /**
   * The previous score, if any.
   */
  public previousScore?: ScoreSaberPreviousScoreOverview;

  /**
   * The BeatLeader score for the score.
   */
  public beatLeaderScore?: BeatLeaderScore;
}
