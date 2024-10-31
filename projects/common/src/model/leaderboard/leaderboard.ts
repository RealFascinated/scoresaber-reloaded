import LeaderboardDifficulty from "./leaderboard-difficulty";
import { Prop } from "@typegoose/typegoose";

export default class Leaderboard {
  /**
   * The id of the leaderboard.
   * @private
   */
  @Prop({ required: true })
  public readonly _id?: number;

  /**
   * The hash of the song this leaderboard is for.
   * @private
   */
  @Prop({ required: true })
  readonly songHash!: string;

  /**
   * The name of the song this leaderboard is for.
   * @private
   */
  @Prop({ required: true })
  readonly songName!: string;

  /**
   * The sub name of the leaderboard.
   * @private
   */
  @Prop({ required: false })
  readonly songSubName!: string;

  /**
   * The author of the song this leaderboard is for.
   * @private
   */
  @Prop({ required: true })
  readonly songAuthorName!: string;

  /**
   * The author of the level this leaderboard is for.
   * @private
   */
  @Prop({ required: true })
  readonly levelAuthorName!: string;

  /**
   * The difficulty of the leaderboard.
   * @private
   */
  @Prop({ required: true, _id: false, type: () => LeaderboardDifficulty })
  readonly difficulty!: LeaderboardDifficulty;

  /**
   * The difficulties of the leaderboard.
   * @private
   */
  @Prop({ required: true, _id: false, type: () => [LeaderboardDifficulty] })
  readonly difficulties!: LeaderboardDifficulty[];

  /**
   * The maximum score of the leaderboard.
   * @private
   */
  @Prop({ required: true })
  maxScore!: number;

  /**
   * Whether the leaderboard is ranked.
   * @private
   */
  @Prop({ required: true })
  readonly ranked!: boolean;

  /**
   * The link to the song art.
   * @private
   */
  @Prop({ required: true })
  readonly songArt!: string;

  /**
   * The date the leaderboard was created.
   * @private
   */
  @Prop({ required: true })
  readonly timestamp!: Date;

  /**
   * The date the leaderboard was last refreshed.
   * @private
   */
  @Prop({ required: true })
  lastRefreshed?: Date;

  get id(): number {
    return this._id ?? 0;
  }
}
