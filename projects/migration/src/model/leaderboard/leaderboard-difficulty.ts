import { type MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { type MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { Prop } from "@typegoose/typegoose";

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
