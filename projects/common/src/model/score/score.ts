import { Modifier } from "../../score/modifier";
import { AdditionalScoreData } from "../additional-score-data/additional-score-data";
import { type Leaderboards } from "../../leaderboard";
import { prop } from "@typegoose/typegoose";

/**
 * The model for a score.
 */
export default class Score {
  /**
   * The internal score id.
   */
  @prop()
  private _id?: number;

  /**
   * The leaderboard the score is from.
   */
  @prop({ required: true })
  public readonly leaderboard!: Leaderboards;

  /**
   * The id of the player who set the score.
   * @private
   */
  @prop({ required: true, index: true })
  public readonly playerId!: string;

  /**
   * The base score for the score.
   * @private
   */
  @prop({ required: true })
  public readonly score!: number;

  /**
   * The accuracy of the score.
   */
  @prop({ required: true })
  public readonly accuracy!: number;

  /**
   * The rank for the score.
   * @private
   */
  @prop({ required: true })
  public readonly rank!: number;

  /**
   * The modifiers used on the score.
   * @private
   */
  @prop({ enum: () => Modifier, type: String, required: true })
  public readonly modifiers!: Modifier[];

  /**
   * The total amount of misses.
   * @private
   */
  @prop({ required: true })
  public readonly misses!: number;

  /**
   * The amount of missed notes.
   */
  @prop({ required: true })
  public readonly missedNotes!: number;

  /**
   * The amount of bad cuts.
   * @private
   */
  @prop({ required: true })
  public readonly badCuts!: number;

  /**
   * Whether every note was hit.
   * @private
   */
  @prop({ required: true })
  public readonly fullCombo!: boolean;

  /**
   * The additional data for the score.
   */
  public additionalData?: AdditionalScoreData;

  /**
   * The time the score was set.
   * @private
   */
  @prop({ required: true })
  public readonly timestamp!: Date;
}

export type ScoreType = InstanceType<typeof Score>;
