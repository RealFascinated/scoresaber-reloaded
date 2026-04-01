import { Prop } from "@typegoose/typegoose";
import { type MapDifficulty } from "../../score/map-difficulty";
import { type MapCharacteristic } from "../../types/map-characteristic";

export default class LeaderboardDifficulty {
  /**
   * The id of the leaderboard.
   */
  @Prop({ required: true })
  leaderboardId!: number;

  /**
   * The difficulty of the leaderboard.
   */
  @Prop({ required: true })
  difficulty!: MapDifficulty;

  /**
   * The characteristic of the leaderboard.
   */
  @Prop({ required: true })
  characteristic!: MapCharacteristic;

  /**
   * The raw difficulty of the leaderboard.
   */
  @Prop({ required: true })
  difficultyRaw!: string;
}
