import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { HandAccuracy } from "./hand-accuracy";
import { Misses } from "./misses";

/**
 * The model for additional score data.
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

  // Above data is only so we can fetch it
  // --------------------------------

  /**
   * The BeatLeader score id for this score.
   */
  @prop({ required: false })
  public scoreId!: number;

  /**
   * The BeatLeader leaderboard id for this score.
   */
  @prop({ required: false })
  public leaderboardId!: string;

  /**
   * The amount of pauses in the play.
   */
  @prop({ required: false })
  public pauses!: number;

  /**
   * The miss data for the play.
   */
  @prop({ required: false, _id: false })
  public misses!: Misses;

  /**
   * The hand accuracy for each hand.
   * @private
   */
  @prop({ required: false, _id: false })
  public handAccuracy!: HandAccuracy;

  /**
   * The full combo accuracy of the play.
   */
  @prop({ required: true })
  public fcAccuracy!: number;

  /**
   * Whether the play was a full combo.
   */
  @prop({ required: true })
  public fullCombo!: boolean;

  /**
   * The score improvement.
   */
  @prop({ required: false, _id: false })
  public scoreImprovement?: {
    /**
     * The change in the score.
     */
    score: number;

    /**
     * The change in the accuracy.
     */
    accuracy: number;

    /**
     * The change in the misses.
     */
    misses: Misses;

    /**
     * The change in pauses.
     */
    pauses?: number;

    /**
     * The change in the hand accuracy.
     */
    handAccuracy: HandAccuracy;
  };

  /**
   * The cached replay id.
   */
  @prop({ required: false })
  public cachedReplayId?: string;

  /**
   * The date the score was set on.
   */
  @prop({ required: true, index: true })
  public timestamp!: Date;
}

export type AdditionalScoreDataDocument = AdditionalScoreData & Document;
export const AdditionalScoreDataModel: ReturnModelType<typeof AdditionalScoreData> =
  getModelForClass(AdditionalScoreData);
