import Leaderboard from "../leaderboard";
import { type LeaderboardStatus } from "../leaderboard-status";
import { getModelForClass, modelOptions, Prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-leaderboards",
    toObject: {
      virtuals: true,
      transform: function (_, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})
export default class ScoreSaberLeaderboard extends Leaderboard {
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
  @Prop({ required: true })
  readonly qualified!: boolean;

  /**
   * The status of the map.
   */
  @Prop({ required: true })
  readonly status!: LeaderboardStatus;
}

export type ScoreSaberLeaderboardDocument = ScoreSaberLeaderboard & Document;
export const ScoreSaberLeaderboardModel: ReturnModelType<typeof ScoreSaberLeaderboard> =
  getModelForClass(ScoreSaberLeaderboard);