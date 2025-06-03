"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";

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

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  const statisticEntries = Object.entries(statisticHistory);
  let currentHistoryIndex = 0;
  for (let dayAgo = 0; dayAgo <= historyDays; dayAgo++) {
    const [dateString, history] =
      statisticEntries.length > currentHistoryIndex ? statisticEntries[currentHistoryIndex] : [];

    labels.push(dateString ? parseDate(dateString) : getDaysAgoDate(dayAgo)); // Add the target date to labels
    datasetConfig.forEach(config => {
      histories[config.field][dayAgo] = history
        ? (getValueFromHistory(history, config.field) ?? null)
        : null;
    });
    currentHistoryIndex++;
  }

  // Reverse the labels and histories arrays to make the latest date and data first
  labels.reverse();
  Object.keys(histories).forEach(field => {
    histories[field].reverse();
  });

  // Render the chart with reversed data
  return (
    <GenericChart
      options={{
        id: id,
      }}
      labels={labels}
      datasetConfig={datasetConfig}
      histories={histories}
    />
  );
}
