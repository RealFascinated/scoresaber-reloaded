"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { formatDateMinimal, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";

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
        <p>No data available for chart...</p>
      </div>
    );
  }

  const labels: Date[] = [];
  const histories: Record<string, (number | null)[]> = {};

  // Initialize histories for each dataset with null values
  datasetConfig.forEach(config => {
    histories[config.field] = [];
  });

  const statisticEntries = Object.entries(statisticHistory);

  // Sort entries by date
  const sortedEntries = statisticEntries.sort(([dateA], [dateB]) => {
    const timeA = parseDate(dateA).getTime();
    const timeB = parseDate(dateB).getTime();
    return timeA - timeB;
  });

  // Get the latest date from the data
  const latestDataDate = getMidnightAlignedDate(
    parseDate(sortedEntries[sortedEntries.length - 1][0])
  );

  // Always use today as the end date to include today's data
  const today = getMidnightAlignedDate(new Date());
  const endDate = new Date(today);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysAmount + 1);

  // Create a map of available data for quick lookup
  const dataMap = new Map(sortedEntries.map(([dateString, history]) => [dateString, history]));

  // Generate all dates in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    labels.push(new Date(currentDate));

    // Format the current date to match the format used in statisticHistory keys
    const currentDateString = formatDateMinimal(currentDate);

    const history = dataMap.get(currentDateString);

    datasetConfig.forEach(config => {
      const value = history ? getValueFromHistory(history, config.field) : null;
      histories[config.field].push(value ?? null);
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <div className="flex justify-center">
      <GenericChart
        config={{
          id,
          datasets: datasetConfig.map(config => ({
            label: config.title,
            data: histories[config.field],
            color: config.color,
            axisId: config.axisId,
            type: config.type,
            pointRadius: config.pointRadius,
            showLegend: config.showLegend,
            stack: config.stack,
            stackOrder: config.stackOrder,
            labelFormatter: config.labelFormatter,
          })),
          axes: Object.fromEntries(datasetConfig.map(config => [config.axisId, config.axisConfig])),
        }}
        labels={labels}
      />
    </div>
  );
}
