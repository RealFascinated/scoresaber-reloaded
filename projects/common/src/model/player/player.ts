import { getModelForClass, modelOptions, prop, Severity } from "@typegoose/typegoose";
import type { Document } from "mongoose";
import { type PeakRank } from "../../player/peak-rank";

/**
 * The model for a player.
 */
@modelOptions({ options: { allowMixed: Severity.ALLOW }, schemaOptions: { collection: "players" } })
export class Player {
  /**
   * The id of the player.
   */
  @prop()
  public _id!: string;

  /**
   * The name of the player.
   */
  @prop()
  public name?: string;

  /**
   * The peak rank of the player
   */
  @prop()
  public peakRank?: PeakRank;

  /**
   * Whether the player has their scores seeded.
   */
  @prop()
  public seededScores?: boolean;

  /**
   * Whether we should track replays for this player.
   */
  @prop()
  public trackReplays?: boolean;

  /**
   * Whether this player is inactive or not.
   */
  @prop({ index: true })
  public inactive?: boolean;

  /**
   * The date the player was last tracked.
   */
  @prop()
  public lastTracked?: Date;

  /**
   * The player's HMD (Head Mounted Display).
   */
  @prop({ index: true })
  public hmd?: string;

  /**
   * The player's pp.
   */
  @prop()
  public pp?: number;

  /**
   * The player's country.
   */
  @prop({ index: true })
  public country?: string;

  /**
   * The player's medal count.
   */
  @prop({ index: true })
  public medals?: number;

  /**
   * The player's medal rank.
   */
  @prop({ index: true })
  public medalsRank?: number;

  /**
   * The date the player was first tracked.
   */
  @prop()
  public trackedSince?: Date;

  /**
   * The date the player's ScoreSaber account was created.
   */
  @prop({ index: true })
  public joinedDate?: Date;

  /**
   * Gets the number of days tracked for this player.
   */
  public async getDaysTracked(): Promise<number> {
    const PlayerHistoryEntryModel = (await import("./player-history-entry"))
      .PlayerHistoryEntryModel;
    return await PlayerHistoryEntryModel.countDocuments({ playerId: this._id });
  }
}

export type PlayerDocument = Player & Document;
export const PlayerModel = getModelForClass(Player);
