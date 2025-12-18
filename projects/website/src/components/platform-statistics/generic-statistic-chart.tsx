"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/api/chart/generic-chart";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { formatDateMinimal, parseDate } from "@ssr/common/utils/time-utils";

type Props = {
  /**
   * The player the chart is for
   */
  statistics: StatisticsType;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];
};

export default function GenericStatisticChart({ statistics, datasetConfig }: Props) {
  const histories: Record<string, (number | null)[]> = {};
  const historyDays = 120; // ~4 months

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  // Create a continuous array of dates for the last 365 days
  const labels: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < historyDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.unshift(date);
  }

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(statistics.daily).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  // Create a map of dates to their index in the labels array
  const dateToIndex = new Map(labels.map((date, index) => [formatDateMinimal(date), index]));

  // Process each day's data
  statisticEntries.forEach(([dateString, history]) => {
    const date = parseDate(dateString);
    const dateKey = formatDateMinimal(date);
    const index = dateToIndex.get(dateKey);

    if (index !== undefined) {
      datasetConfig.forEach(config => {
        const value = history[config.field as keyof typeof history];
        if (value !== undefined) {
          histories[config.field][index] = value;
        }
      });
    }
  });

  const config = buildChartConfig({
    id: "statistic-chart",
    datasetConfig,
    seriesByField: histories,
  });

  // Render the chart with collected data
  return (
    <div className="h-[360px] w-full">
      <GenericChart labels={labels} config={config} />
    </div>
  );
}
