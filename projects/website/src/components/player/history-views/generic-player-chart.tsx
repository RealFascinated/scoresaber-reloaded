"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";

type Props = {
  /**
   * The id of the chart
   */
  id: string;

  /**
   * The player the chart is for
   */
  statisticHistory: PlayerStatisticHistory;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];

  /**
   * The number of days to show in the chart.
   */
  daysAmount?: number;
};

export default function GenericPlayerChart({
  id,
  statisticHistory,
  datasetConfig,
  daysAmount = 50,
}: Props) {
  // Check if player statistics are available
  if (!statisticHistory || Object.keys(statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }

  const labels: Date[] = [];
  const histories: Record<string, (number | null)[]> = {};
  const historyDays = daysAmount;

  // Initialize histories for each dataset with null values
  datasetConfig.forEach(config => {
    histories[config.field] = [];
  });

  const statisticEntries = Object.entries(statisticHistory);

  // Sort entries by date
  const sortedEntries = statisticEntries.sort(([dateA], [dateB]) => {
    const timeA = getMidnightAlignedDate(parseDate(dateA)).getTime();
    const timeB = getMidnightAlignedDate(parseDate(dateB)).getTime();
    return timeA - timeB;
  });

  // Use the actual data points we have
  sortedEntries.forEach(([dateString, history]) => {
    const date = parseDate(dateString);
    labels.push(date);

    datasetConfig.forEach(config => {
      const value = getValueFromHistory(history, config.field);
      histories[config.field].push(value ?? null);
    });
  });

  return (
    <div className="flex justify-center">
      <GenericChart
        options={{ id }}
        labels={labels}
        histories={histories}
        datasetConfig={datasetConfig}
      />
    </div>
  );
}
