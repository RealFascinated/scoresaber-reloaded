import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { PlayerHistory } from "../player/player-history";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "../utils/time-utils";

/**
 * The model for a player.
 */
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Player {
  /**
   * The id of the player.
   */
  @prop()
  public _id!: string;

  /**
   * The player's name.
   */
  @prop()
  public name?: string;

  /**
   * The player's statistic history.
   */
  @prop()
  private statisticHistory?: Record<string, PlayerHistory>;

  /**
   * Whether the player has their scores seeded.
   */
  @prop()
  public seededScores?: boolean;

  /**
   * The date the player was last tracked.
   */
  @prop()
  public lastTracked?: Date;

  /**
   * The date the player was first tracked.
   */
  @prop()
  public trackedSince?: Date;

  /**
   * Gets the player's statistic history.
   */
  public getStatisticHistory(): Record<string, PlayerHistory> {
    if (this.statisticHistory === undefined) {
      this.statisticHistory = {};
    }
    return this.statisticHistory;
  }

  /**
   * Gets the player's history for a specific date.
   *
   * @param date the date to get the history for.
   */
  public getHistoryByDate(date: Date): PlayerHistory {
    if (this.statisticHistory === undefined) {
      this.statisticHistory = {};
    }
    return this.getStatisticHistory()[formatDateMinimal(getMidnightAlignedDate(date))] || {};
  }

  /**
   * Gets the player's history for the previous X days.
   *
   * @param days the number of days to get the history for.
   */
  public getHistoryPreviousDays(days: number): Record<string, PlayerHistory> {
    const statisticHistory = this.getStatisticHistory();
    const history: Record<string, PlayerHistory> = {};

    for (let i = 0; i <= days; i++) {
      const date = formatDateMinimal(getMidnightAlignedDate(getDaysAgoDate(i)));
      const playerHistory = statisticHistory[date];
      if (playerHistory !== undefined && Object.keys(playerHistory).length > 0) {
        history[date] = playerHistory;
      }
    }
    return history;
  }

  /**
   * Sets the player's statistic history.
   *
   * @param date the date to set it for.
   * @param history the history to set.
   */
  public setStatisticHistory(date: Date, history: PlayerHistory) {
    if (this.statisticHistory === undefined) {
      this.statisticHistory = {};
    }
    this.statisticHistory[formatDateMinimal(getMidnightAlignedDate(date))] = history;
  }

  /**
   * Sorts the player's statistic history by
   * date in descending order. (oldest to newest)
   */
  public sortStatisticHistory() {
    if (this.statisticHistory === undefined) {
      this.statisticHistory = {};
    }
    this.statisticHistory = Object.fromEntries(
      Object.entries(this.statisticHistory).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    );
  }

  /**
   * Gets the number of days tracked.
   *
   * @returns the number of days tracked.
   */
  public getDaysTracked(): number {
    return Object.keys(this.getStatisticHistory()).length;
  }
}

export type PlayerDocument = Player & Document;
export const PlayerModel: ReturnModelType<typeof Player> = getModelForClass(Player);
