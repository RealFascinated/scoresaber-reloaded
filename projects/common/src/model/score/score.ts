import { modelOptions, prop, Severity } from "@typegoose/typegoose";
import { type MapDifficulty } from "../../score/map-difficulty";
import { Modifier } from "../../score/modifier";
import { type MapCharacteristic } from "../../types/map-characteristic";
import { AdditionalScoreData } from "../additional-score-data/additional-score-data";

/**
 * The model for a score.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
})
export default class Score {
  /**
   * The internal score id.
   */
  @prop()
  public _id?: number;

  /**
   * The id of the player who set the score.
   */
  @prop({ required: true, index: true })
  public readonly playerId!: string;

  /**
   * The map difficulty played in the score.
   */
  @prop({ required: true })
  public readonly difficulty!: MapDifficulty;

  /**
   * The characteristic of the map.
   */
  @prop({ required: true })
  public readonly characteristic!: MapCharacteristic;

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
  public accuracy!: number;

  /**
   * The rank for the score.
   * @private
   */
  @prop({ required: true })
  public rank!: number;

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
  @prop({ required: true, index: true })
  public readonly timestamp!: Date;
}

export type ScoreType = InstanceType<typeof Score>;
