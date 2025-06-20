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

  // Create a map of available data for quick lookup
  const dataMap = new Map(sortedEntries.map(([dateString, history]) => [dateString, history]));

  // Use the latest data date as end date, but check if today's data exists
  const today = getMidnightAlignedDate(new Date());
  const todayString = formatDateMinimal(today);
  const hasTodayData = dataMap.has(todayString);

  console.log("Debug dates:");
  console.log("Today (midnight aligned):", today);
  console.log("Today string:", todayString);
  console.log("Has today data:", hasTodayData);
  console.log("Available data keys:", Array.from(dataMap.keys()));
  console.log("Latest data date:", latestDataDate);

  // Use today as end date if today's data exists, otherwise use latest data date
  const endDate = hasTodayData ? new Date(today) : new Date(latestDataDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysAmount + 1);

  // Generate all dates in the range
  const currentDate = new Date(startDate);
  console.log("Chart date range:");
  console.log("Start date:", startDate);
  console.log("End date:", endDate);
  console.log("Days amount:", daysAmount);

  // Use a more reliable approach: generate exactly the number of days we need
  for (let i = 0; i < daysAmount; i++) {
    const dateToProcess = new Date(startDate);
    dateToProcess.setDate(startDate.getDate() + i);

    labels.push(new Date(dateToProcess));

    // Format the current date to match the format used in statisticHistory keys
    const currentDateString = formatDateMinimal(dateToProcess);

    const history = dataMap.get(currentDateString);

    // Debug: Log when we process today's date
    if (currentDateString === "Jun 20, 2025") {
      console.log("Processing today:", currentDateString, "Data found:", !!history);
    }

    datasetConfig.forEach(config => {
      const value = history ? getValueFromHistory(history, config.field) : null;
      histories[config.field].push(value ?? null);
    });
  }

  console.log("Total labels generated:", labels.length);
  console.log("Last label:", labels[labels.length - 1]);

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
