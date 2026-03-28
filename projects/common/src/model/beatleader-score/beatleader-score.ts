import { getModelForClass, index, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { type MapCharacteristic } from "../../schemas/map/map-characteristic";
import { type MapDifficulty } from "../../schemas/map/map-difficulty";
import { HandAccuracy } from "./hand-accuracy";
import { Misses } from "./misses";

/**
 * The model for BeatLeader score.
 */
@index({ playerId: 1, songHash: 1, leaderboardId: 1, timestamp: -1 })
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "additional-score-data",
  },
})
export class BeatLeaderScore {
  /**
   * The id of the player who set the score.
   */
  @prop({ required: true })
  public playerId!: string;

  /**
   * The hash of the song.
   */
  @prop({ required: true })
  public songHash!: string;

  /**
   * The difficulty the score was set on.
   */
  @prop({ required: true })
  public songDifficulty!: MapDifficulty;

  /**
   * The characteristic of the song.
   */
  @prop({ required: true })
  public songCharacteristic!: MapCharacteristic;

  /**
   * The score of the play.
   */
  @prop({ required: true })
  public songScore!: number;

  // Above data is only so we can fetch it
  // --------------------------------

  /**
   * The BeatLeader score id for this score.
   */
  @prop({ required: false, index: true })
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
   * Whether the replay was saved to storage.
   */
  @prop({ required: false, index: true })
  public savedReplay?: boolean;

  /**
   * The date the score was set on.
   */
  @prop({ required: true })
  public timestamp!: Date;
}

export type BeatLeaderScoreDocument = BeatLeaderScore & Document;
export const BeatLeaderScoreModel: ReturnModelType<typeof BeatLeaderScore> =
  getModelForClass(BeatLeaderScore);
