import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { PlayerHistory } from "../player/player-history";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "../utils/time-utils";
import { ScoreService } from "backend/src/service/score.service";
import { ScoreSaberHMDs } from "../utils/scoresaber.util";

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

    // Calculate date range in UTC to avoid timezone issues
    const endDate = getMidnightAlignedDate(new Date()); // Today's midnight in UTC
    const startDate = getMidnightAlignedDate(getDaysAgoDate(days + 1)); // X days ago midnight in UTC

    // Convert to timestamp for easier comparison
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    // Filter statisticHistory to only include dates within the specified range
    Object.keys(statisticHistory)
      .filter(date => {
        const dateTimestamp = Date.parse(date); // Assuming date is in a string format like "DD MMM YYYY"
        return dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp;
      })
      .forEach(date => {
        const playerHistory = statisticHistory[date];
        if (playerHistory && Object.keys(playerHistory).length > 0) {
          history[date] = playerHistory;
        }
      });
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

  /**
   * Gets the most common hmd used in the last 50 scores.
   */
  public async getHmd(): Promise<string> {
    const scores = await ScoreService.getPlayerScores(this._id, {
      limit: 50,
      projection: {
        hmd: 1,
      },
    });

    const hmds: Map<string, number> = new Map();
    for (const score of scores) {
      if (!score.hmd) {
        continue;
      }
      hmds.set(ScoreSaberHMDs[score.hmd], (hmds.get(score.hmd) || 0) + 1);
    }

    if (hmds.size === 0) {
      return ScoreSaberHMDs[0];
    }
    return Array.from(hmds.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }
}

export type PlayerDocument = Player & Document;
export const PlayerModel: ReturnModelType<typeof Player> = getModelForClass(Player);
