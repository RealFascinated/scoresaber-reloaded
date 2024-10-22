import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

/**
 * The model for a BeatSaver map.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "additional-score-data",
    toObject: {
      virtuals: true,
      transform: function (_, ret) {
        delete ret._id;
        delete ret.playerId;
        delete ret.songHash;
        delete ret.songDifficulty;
        delete ret.songScore;
        delete ret.__v;
        return ret;
      },
    },
  },
})
export class AdditionalScoreData {
  /**
   * The of the player who set the score.
   */
  @prop({ required: true, index: true })
  public playerId!: string;

  /**
   * The hash of the song.
   */
  @prop({ required: true, index: true })
  public songHash!: string;

  /**
   * The difficulty the score was set on.
   */
  @prop({ required: true, index: true })
  public songDifficulty!: string;

  /**
   * The score of the play.
   */
  @prop({ required: true, index: true })
  public songScore!: number;

  /**
   * The amount of times a bomb was hit.
   */

  @prop({ required: false })
  public bombCuts!: number;

  /**
   * The amount of walls hit in the play.
   */
  @prop({ required: false })
  public wallsHit!: number;

  /**
   * The amount of pauses in the play.
   */
  @prop({ required: false })
  public pauses!: number;

  /**
   * The hand accuracy for each hand.
   * @private
   */
  @prop({ required: false })
  public handAccuracy!: {
    /**
     * The left hand accuracy.
     */
    left: number;

    /**
     * The right hand accuracy.
     */
    right: number;
  };

  /**
   * The full combo accuracy of the play.
   */
  @prop({ required: true })
  public fcAccuracy!: number;
}

export type AdditionalScoreDataDocument = AdditionalScoreData & Document;
export const AdditionalScoreDataModel: ReturnModelType<typeof AdditionalScoreData> =
  getModelForClass(AdditionalScoreData);
