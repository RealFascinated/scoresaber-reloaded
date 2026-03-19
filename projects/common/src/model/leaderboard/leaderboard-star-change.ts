import { getModelForClass, index, modelOptions, Prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    collection: "scoresaber-leaderboard-star-change",
  },
})
@index({ leaderboardId: 1, timestamp: -1 })
export class ScoreSaberLeaderboardStarChangeInternal {
  @Prop({ required: true, index: true })
  readonly leaderboardId!: number;

  @Prop({ required: true })
  readonly previousStars!: number;

  @Prop({ required: true })
  readonly newStars!: number;

  @Prop({ required: true })
  readonly timestamp!: Date;
}

export type ScoreSaberLeaderboardStarChange = InstanceType<typeof ScoreSaberLeaderboardStarChangeInternal>;
export type ScoreSaberLeaderboardStarChangeDocument = ScoreSaberLeaderboardStarChange & Document;
export const ScoreSaberLeaderboardStarChangeModel: ReturnModelType<
  typeof ScoreSaberLeaderboardStarChangeInternal
> = getModelForClass(ScoreSaberLeaderboardStarChangeInternal);
