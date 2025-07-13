"use client";

import { ChartConfig, DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
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
  const historyDays = 180; // 6 months

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

  const config: ChartConfig = {
    id: "statistic-chart",
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
    axes: Object.fromEntries(
      datasetConfig.map(config => [
        config.axisId,
        {
          display: config.axisConfig?.display ?? true,
          position: config.axisConfig?.position ?? "left",
          reverse: config.axisConfig?.reverse ?? false,
          displayName: config.axisConfig?.displayName ?? config.title,
          valueFormatter: config.axisConfig?.valueFormatter,
          min: config.axisConfig?.min,
          max: config.axisConfig?.max,
          hideOnMobile: config.axisConfig?.hideOnMobile,
        },
      ])
    ),
  };

  // Render the chart with collected data
  return (
    <div className="h-[360px] w-full">
      <GenericChart labels={labels} config={config} />
    </div>
  );
}
