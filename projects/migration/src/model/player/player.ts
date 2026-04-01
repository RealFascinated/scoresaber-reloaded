import { type PeakRank } from "@ssr/common/player/peak-rank";
import { getModelForClass, index, modelOptions, prop, Severity } from "@typegoose/typegoose";
import type { Document } from "mongoose";
import { PlayerScoreStats } from "./player-score-stats";

/**
 * The model for a player.
 */
@modelOptions({ options: { allowMixed: Severity.ALLOW }, schemaOptions: { collection: "players" } })
@index({ inactive: 1, pp: -1 })
@index({ joinedDate: 1 })
@index({ name: "text" })
@index({ medals: -1, _id: 1 })
@index({ country: 1, medals: -1, _id: 1 })
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
  @prop({ index: true })
  public seededScores?: boolean;

  /**
   * Whether the player has their BeatLeader scores seeded.
   */
  @prop({ index: true })
  public seededBeatLeaderScores?: boolean;

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
   * Whether this player is banned or not.
   */
  @prop()
  public banned?: boolean;

  /**
   * The player's HMD (Head Mounted Display).
   */
  @prop()
  public hmd?: string;

  /**
   * The player's pp.
   */
  @prop({ index: true })
  public pp?: number;

  /**
   * The player's country.
   */
  @prop()
  public country?: string;

  /**
   * The player's medal count.
   */
  @prop({ index: true })
  public medals?: number;

  /**
   * The player's score stats.
   */
  @prop({ _id: false, type: () => PlayerScoreStats })
  public scoreStats?: PlayerScoreStats;

  /**
   * The date the player was first tracked.
   */
  @prop()
  public trackedSince?: Date;

  /**
   * The date the player's ScoreSaber account was created.
   */
  @prop()
  public joinedDate?: Date;

  /**
   * Whether the profile picture has been cached.
   */
  @prop()
  public cachedProfilePicture?: boolean;

  /**
   * Gets the number of days tracked for this player.
   */
  public async getDaysTracked(): Promise<number> {
    const PlayerHistoryEntryModel = (await import("./player-history-entry")).PlayerHistoryEntryModel;
    return await PlayerHistoryEntryModel.countDocuments({ playerId: this._id });
  }
}

export type PlayerDocument = Player & Document;
export const PlayerModel = getModelForClass(Player);
