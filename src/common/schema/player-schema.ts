import mongoose, { Document, Schema } from "mongoose";
import { PlayerHistory } from "@/common/player/player-history";
import { formatDateMinimal, getDaysAgo, getMidnightAlignedDate } from "@/common/time-utils";
import { sortPlayerHistory } from "@/common/player-utils";

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
   * The first time the player was tracked
   */
  trackedSince: Date;

  /**
   * Gets when this player was last tracked.
   *
   * @returns the date when the player was last tracked
   */
  getLastTracked(): Date;

  /**
   * Gets the history for the given date
   *
   * @param date
   * @returns the player history
   */
  getHistoryByDate(date: Date): PlayerHistory;

  /**
   * Gets the history for the previous X days
   *
   * @param amount the amount of days
   * @returns the player history
   */
  getHistoryPrevious(amount: number): { [key: string]: PlayerHistory };

  /**
   * Gets all the statistic history
   *
   * @returns the statistic history
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
   *
   * @returns the sorted statistic history
   */
  sortStatisticHistory(): Map<string, PlayerHistory>;
}

// Mongoose Schema definition for Player
const PlayerSchema = new Schema<IPlayer>({
  _id: { type: String, required: true },
  lastTracked: { type: Date, default: new Date(), required: false },
  statisticHistory: { type: Map, default: () => new Map(), required: false },
  trackedSince: { type: Date, default: new Date(), required: false },
});

PlayerSchema.methods.getLastTracked = function (): Date {
  return this.ked || new Date();
};

PlayerSchema.methods.getHistoryByDate = function (date: Date): PlayerHistory {
  return this.statisticHistory.get(formatDateMinimal(getMidnightAlignedDate(date))) || {};
};

PlayerSchema.methods.getHistoryPrevious = function (amount: number): {
  [key: string]: PlayerHistory;
} {
  const toReturn: { [key: string]: PlayerHistory } = {};
  const history = sortPlayerHistory(this.getStatisticHistory());

  for (const [date, stat] of history) {
    const parsedDate = new Date(date);
    if (getDaysAgo(parsedDate) + 1 <= amount) {
      toReturn[date] = stat;
    }
  }

  return toReturn;
};

PlayerSchema.methods.getStatisticHistory = function (): Map<Date, PlayerHistory> {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }
  return this.statisticHistory;
};

PlayerSchema.methods.setStatisticHistory = function (date: Date, data: PlayerHistory): void {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }
  return this.statisticHistory.set(formatDateMinimal(getMidnightAlignedDate(date)), data);
};

PlayerSchema.methods.sortStatisticHistory = function (): Map<Date, PlayerHistory> {
  if (!this.statisticHistory) {
    this.statisticHistory = new Map();
  }

  // Sort the player's history
  this.statisticHistory = new Map(
    Array.from(this.statisticHistory.entries() as [string, PlayerHistory][])
      .sort((a: [string, PlayerHistory], b: [string, PlayerHistory]) => Date.parse(b[0]) - Date.parse(a[0]))
      // Convert the date strings back to Date objects for the resulting Map
      .map(([date, history]) => [formatDateMinimal(new Date(date)), history])
  );
  return this.statisticHistory;
};

// Mongoose Model for Player
const PlayerModel = mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);

export { PlayerModel };
