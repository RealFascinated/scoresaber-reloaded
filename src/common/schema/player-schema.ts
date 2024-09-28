import mongoose, { Document, Schema } from "mongoose";
import { PlayerHistory } from "@/common/player/player-history";
import { formatDateMinimal, getMidnightAlignedDate } from "@/common/time-utils";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";

// Interface for Player Document
export interface IPlayer extends Document {
  /**
   * The player's id
   */
  id: string;

  /**
   * The player's statistic history
   */
  statisticHistory: Map<string, PlayerHistory>;

  /**
   * The last time the player was tracked
   */
  lastTracked: Date;

  /**
   * The raw player data.
   */
  rawPlayer: ScoreSaberPlayer;

  /**
   * Gets when this player was last tracked.
   */
  getLastTracked(): Date;

  /**
   * Gets the history for the given date
   *
   * @param date
   */
  getHistory(date: Date): PlayerHistory;

  /**
   * Gets all the statistic history
   */
  getStatisticHistory(): Map<string, PlayerHistory>;

  /**
   * Sets the statistic history for the given date
   *
   * @param date the date to set it on
   * @param data the data to set
   */
  setStatisticHistory(date: Date, data: PlayerHistory): void;

  /**
   * Sorts the statistic history
   */
  sortStatisticHistory(): Map<string, PlayerHistory>;
}

// Mongoose Schema definition for Player
const PlayerSchema = new Schema<IPlayer>({
  _id: { type: String, required: true },
  lastTracked: { type: Date, default: new Date(), required: false },
  rawPlayer: { type: Object, required: false },
  statisticHistory: { type: Map, default: () => new Map(), required: false },
});

PlayerSchema.methods.getLastTracked = function (): Date {
  return this.lastTracked || new Date();
};

PlayerSchema.methods.getHistory = function (date: Date): PlayerHistory {
  return (
    this.statisticHistory.get(
      formatDateMinimal(getMidnightAlignedDate(date)),
    ) || {}
  );
};

PlayerSchema.methods.getStatisticHistory = function (): Map<
  Date,
  PlayerHistory
> {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }
  return this.statisticHistory;
};

PlayerSchema.methods.setStatisticHistory = function (
  date: Date,
  data: PlayerHistory,
): void {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }
  return this.statisticHistory.set(
    formatDateMinimal(getMidnightAlignedDate(date)),
    data,
  );
};

PlayerSchema.methods.sortStatisticHistory = function (): Map<
  Date,
  PlayerHistory
> {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }

  // Sort the player's history
  this.statisticHistory = new Map(
    Array.from(this.statisticHistory.entries() as [string, PlayerHistory][])
      .sort(
        (a: [string, PlayerHistory], b: [string, PlayerHistory]) =>
          Date.parse(b[0]) - Date.parse(a[0]),
      )
      // Convert the date strings back to Date objects for the resulting Map
      .map(([date, history]) => [formatDateMinimal(new Date(date)), history]),
  );
  return this.statisticHistory;
};

// Mongoose Model for Player
const PlayerModel =
  mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);

export { PlayerModel };
