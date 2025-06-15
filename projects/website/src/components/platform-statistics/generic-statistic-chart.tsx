"use client";

import { ChartConfig, DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";

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
  const historyDays = 365;

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  const labels: Date[] = [];

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(statistics).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  let currentHistoryIndex = 0;

  for (let dayAgo = historyDays; dayAgo >= 1; dayAgo--) {
    // skip the current day
    const targetDate = getDaysAgoDate(dayAgo);
    labels.push(targetDate); // Add the target date to labels

    if (currentHistoryIndex < statisticEntries.length) {
      const [dateString, history] = statisticEntries[currentHistoryIndex];
      const entryDate = parseDate(dateString);

      if (entryDate.toDateString() === targetDate.toDateString()) {
        datasetConfig.forEach(config => {
          histories[config.field][historyDays - dayAgo] =
            history[config.field as Statistic] ?? null;
        });
        currentHistoryIndex++;
      }
    }
  }

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
  return <GenericChart labels={labels} config={config} />;
}
