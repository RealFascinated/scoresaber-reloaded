import { getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { Document } from "mongoose";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate } from "../../utils/time-utils";
import { type StatisticsType } from "./statistic-type";

/**
 * The model for a Game Statistic.
 */
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Statistics {
  /**
   * The id of the statistic.
   */
  @prop()
  public _id!: string;

  /**
   * The statistics tracked.
   *
   * Date, Map<Statistic, number>
   */
  @prop()
  public statistics!: StatisticsType;

  /**
   * Gets the previous days' statistics.
   *
   * @param days the amount of days to get
   */
  public getPrevious(days: number): StatisticsType {
    const history: StatisticsType = {};

    for (let i = 0; i <= days; i++) {
      const date = formatDateMinimal(getMidnightAlignedDate(getDaysAgoDate(i)));
      const statistic = this.statistics[date];
      if (statistic !== undefined && Object.keys(statistic).length > 0) {
        history[date] = statistic;
      }
    }
    return history;
  }
}

export type StatisticsDocument = Statistics & Document;
export const StatisticsModel: ReturnModelType<typeof Statistics> = getModelForClass(Statistics);
