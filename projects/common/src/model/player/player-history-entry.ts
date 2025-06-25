import { getModelForClass, modelOptions, prop, Severity } from "@typegoose/typegoose";
import type { Document } from "mongoose";

/**
 * The model for a player history entry.
 */
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { collection: "player-history" },
})
export class PlayerHistoryEntry {
  /**
   * The id of the history entry.
   */
  @prop()
  public _id!: string;

  /**
   * The id of the player this history entry belongs to.
   */
  @prop({ required: true, index: true })
  public playerId!: string;

  /**
   * The date this history entry is for.
   */
  @prop({ required: true, index: true })
  public date!: Date;

  /**
   * The player's rank.
   */
  @prop()
  public rank?: number;

  /**
   * The player's country rank.
   */
  @prop()
  public countryRank?: number;

  /**
   * The pp of the player.
   */
  @prop()
  public pp?: number;

  /**
   * The amount of pp required to gain 1 global pp.
   */
  @prop()
  public plusOnePp?: number;

  /**
   * How many times replays of the player scores have been watched
   */
  @prop()
  public replaysWatched?: number;

  /**
   * The total amount of unranked and ranked score.
   */
  @prop()
  public totalScore?: number;

  /**
   * The total amount of ranked score.
   */
  @prop()
  public totalRankedScore?: number;

  /**
   * The amount of ranked scores set.
   */
  @prop()
  public rankedScores?: number;

  /**
   * The amount of unranked scores set.
   */
  @prop()
  public unrankedScores?: number;

  /**
   * The amount of ranked score that were improved.
   */
  @prop()
  public rankedScoresImproved?: number;

  /**
   * The amount of unranked score that were improved.
   */
  @prop()
  public unrankedScoresImproved?: number;

  /**
   * The total amount of ranked scores
   */
  @prop()
  public totalRankedScores?: number;

  /**
   * The total amount of unranked scores
   */
  @prop()
  public totalUnrankedScores?: number;

  /**
   * The total amount of scores
   */
  @prop()
  public totalScores?: number;

  /**
   * The player's average ranked accuracy.
   */
  @prop()
  public averageRankedAccuracy?: number;

  /**
   * The player's average unranked accuracy.
   */
  @prop()
  public averageUnrankedAccuracy?: number;

  /**
   * The player's average accuracy.
   */
  @prop()
  public averageAccuracy?: number;
}

export type PlayerHistoryEntryDocument = PlayerHistoryEntry & Document;
export const PlayerHistoryEntryModel = getModelForClass(PlayerHistoryEntry);
