import {
  getModelForClass,
  modelOptions,
  Prop,
  ReturnModelType,
  Severity,
} from "@typegoose/typegoose";
import { Document } from "mongoose";
import Leaderboard from "../leaderboard";
import { type LeaderboardStatus } from "../leaderboard-status";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-leaderboards",
  },
})
export default class ScoreSaberLeaderboardInternal extends Leaderboard {
  /**
   * The star count for the leaderboard.
   */
  @Prop({ required: true })
  readonly stars!: number;

  /**
   * The total amount of plays.
   */
  @Prop({ required: true })
  readonly plays!: number;

  /**
   * The amount of plays today.
   */
  @Prop({ required: true })
  readonly dailyPlays!: number;

  /**
   * Whether this leaderboard is qualified to be ranked.
   */
  @Prop({ required: true, index: true })
  readonly qualified!: boolean;

  /**
   * The status of the map.
   */
  @Prop({ required: true })
  readonly status!: LeaderboardStatus;

  /**
   * The date the leaderboard was ranked.
   */
  @Prop({ required: false, index: true })
  readonly dateRanked?: Date;

  /**
   * The date the leaderboard was qualified.
   */
  @Prop({ required: false })
  readonly dateQualified?: Date;

  /**
   * Whether all of the players on this leaderboard
   * have been tracked.
   */
  @Prop({ required: false })
  readonly seededPlayers!: boolean;
}

export type ScoreSaberLeaderboard = InstanceType<typeof ScoreSaberLeaderboardInternal>;
export type ScoreSaberLeaderboardDocument = ScoreSaberLeaderboard & Document;
export const ScoreSaberLeaderboardModel: ReturnModelType<typeof ScoreSaberLeaderboardInternal> =
  getModelForClass(ScoreSaberLeaderboardInternal);
